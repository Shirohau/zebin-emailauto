import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { saveAs } from 'file-saver'
import { useRouter } from 'vue-router'
import { apiFetch } from '../api'

const GENERAL_REVIEW_LINK =
  'https://www.amazon.com/gp/your-account/order-history?ref_=ya_d_c_yo'

const SCHEDULED_SMTP_STORAGE = 'amz_scheduled_smtp_v1'
const SCHEDULED_SMTP_MAX = 50
const SCHEDULE_TICK_MS = 15000
const IMGBB_API_KEY_STORAGE = 'amz_imgbb_api_key_v1'

function defaultTemplates() {
  return {
    warranty_asin: {
      subject: 'Important info regarding your order - extended warranty',
      html: `<p>Hi <span class="variable-tag" contenteditable="false">{收件人名称}</span>,</p>
<p>Thank you for your purchase and trusting.<br>Yes, we have <b><span style="color:#e67e22">extended your warranty</span></b> for free.</p>
<p>BTW, We've prepared <b>free gifts</b> to share with some lucky customers,<br>May I have the honor of inviting you to join this event?</p>
<p>If you're interested, it only takes 2 mins to participate:<br>1. Help us <span style="color:#e67e22">post a 5-star review!</span><br>2. Let me know your <b>choice</b> (Choose 1 of 6), <b>address</b>, and <b>a screenshot of review</b>.</p>
<p><br>[请在此处粘贴礼物截图]<br></p>
<p>3.We'll ship the gift within 24 hours after getting your info.</p>
<hr>
<p>How to leave the review:<br>1.Click the Amazon link<br><a href="{留评链接}"><span class="variable-tag" contenteditable="false">{留评链接}</span></a><br>2.Or scan the QR code, find your order, click "Write a product review", then post 5 stars.</p>
<p style="text-align:center;"><span class="variable-tag qr-tag" contenteditable="false">{留评二维码}</span></p>
<p><br>[请在此处粘贴步骤指导截图]<br></p>`,
    },
    warranty_no: {
      subject: 'Important info regarding your order - extended warranty',
      html: `<p>Hi <span class="variable-tag" contenteditable="false">{收件人名称}</span>,</p>
<p>Thank you for your purchase and trusting.<br>Yes, we have <b><span style="color:#e67e22">extended your warranty</span></b> for free.</p>
<p>BTW, We've prepared <b>free gifts</b> to share with some lucky customers,<br>May I have the honor of inviting you to join this event?</p>
<p>If you're interested, it only takes 2 mins to participate:<br>1. Help us <span style="color:#e67e22">post a 5-star review!</span><br>2. Let me know your <b>choice</b> (Choose 1 of 6), <b>address</b>, and <b>a screenshot of review</b>.</p>
<p><br>[请在此处粘贴礼物截图]<br></p>
<p>3.We'll ship the gift within 24 hours after getting your info.</p>
<hr>
<p>Here is how to post a 5-star review:<br>1.Click the below Amazon link, or scan the QR code via your phone.<br>2.Then find your order, click "Write a product review", then Post a 5-star review!<br><a href="${GENERAL_REVIEW_LINK}">${GENERAL_REVIEW_LINK}</a></p>
<p style="text-align:center;"><span class="variable-tag qr-tag" contenteditable="false">{留评二维码}</span></p>
<p><br>[请在此处粘贴步骤指导截图]<br></p>`,
    },
    bags_asin: {
      subject: 'Update on your recent order',
      html: `<p>Hi <span class="variable-tag" contenteditable="false">{收件人名称}</span>,</p>
<p>Thanks for your purchase!<br>Just a heads-up: the storage bags from our US warehouse are currently out of stock, with restocking expected in 20-30 days.</p>
<p>As a gesture of goodwill, we would like to offer you two options:<br>1. $6 refund (matches the bag's value) - reply with your PayPal email or Zelle account for 24-hour processing.<br>2. Wait for restock - we'll ship the bags once available.</p>
<p>Whichever you choose, invite you join our 2-minute "Lucky Customer Appreciation" program:<br>☑ Leave a 5-star review.<br>☑ Send the review screenshot + your choice of 1 free gift (6 options) + shipping address.</p>
<p><br>[请在此处粘贴礼物截图]<br></p>
<p>3.We'll ship the gift within 24 hours after getting your info.</p>
<hr>
<p>How to leave the review:<br>1.Click the Amazon link<br><a href="{留评链接}"><span class="variable-tag" contenteditable="false">{留评链接}</span></a><br>2.Or scan the QR code, find your order, click "Write a product review", then post 5 stars.</p>
<p style="text-align:center;"><span class="variable-tag qr-tag" contenteditable="false">{留评二维码}</span></p>
<p><br>[请在此处粘贴步骤指导截图]<br></p>`,
    },
    bags_no: {
      subject: 'Update on your recent order',
      html: `<p>Hi <span class="variable-tag" contenteditable="false">{收件人名称}</span>,</p>
<p>Thanks for your purchase!<br>Just a heads-up: the storage bags from our US warehouse are currently out of stock, with restocking expected in 20-30 days.</p>
<p>As a gesture of goodwill, we would like to offer you two options:<br>1. $6 refund (matches the bag's value) - reply with your PayPal email or Zelle account for 24-hour processing.<br>2. Wait for restock - we'll ship the bags once available.</p>
<p>Whichever you choose, invite you join our 2-minute "Lucky Customer Appreciation" program:<br>☑ Leave a 5-star review.<br>☑ Send the review screenshot + your choice of 1 free gift (6 options) + shipping address.</p>
<p><br>[请在此处粘贴礼物截图]<br></p>
<p>3.We'll ship the gift within 24 hours after getting your info.</p>
<hr>
<p>Here is how to post a 5-star review:<br>1.Click the below Amazon link, or scan the QR code via your phone.<br>2.Then find your order, click "Write a product review", then Post a 5-star review!<br><a href="${GENERAL_REVIEW_LINK}">${GENERAL_REVIEW_LINK}</a></p>
<p style="text-align:center;"><span class="variable-tag qr-tag" contenteditable="false">{留评二维码}</span></p>
<p><br>[请在此处粘贴步骤指导截图]<br></p>`,
    },
  }
}

export function useMailConsole(toastRootRef) {
  const router = useRouter()
  let toastContainerEl = null

  if (toastRootRef) {
    watch(
      toastRootRef,
      (el) => {
        if (el) toastContainerEl = el
      },
      { immediate: true }
    )
  }

  const asinPresets = ref([])
  const orderData = ref([])
  const TEMPLATES = reactive(JSON.parse(JSON.stringify(defaultTemplates())))
  const currentMainTab = ref('warranty')
  const currentSubTab = ref('asin')
  const subjectInput = ref('')
  const emailEditorRef = ref(null)
  const editorWrapperRef = ref(null)
  const imageResizerRef = ref(null)
  const resizerHandleRef = ref(null)
  const previewOrderSelect = ref('')
  const previewHtml = ref('')
  const dispatchGroups = ref([])
  const scheduledJobsDisplay = ref([])
  const scheduledBadgeText = ref('')
  const scheduledWrapVisible = ref(false)

  const asinManagerOpen = ref(false)
  const dispatchModalOpen = ref(false)
  const orderModalOpen = ref(false)
  const scheduleSmtpModalOpen = ref(false)
  const imgbbModalOpen = ref(false)

  const imgbbFileInputRef = ref(null)
  const imgbbApiKeyInput = ref('')
  const scheduleSmtpTaskTitle = ref('—')
  const scheduleSmtpDatetime = ref('')

  const statTotal = computed(() => orderData.value.length)
  const statHitRate = computed(() =>
    orderData.value.filter((o) => asinPresets.value.some((a) => a.asin === o.asin)).length
  )

  const inputAsin = ref('')
  const inputProductName = ref('')
  const inputReviewLink = ref('')
  const inputOrderNum = ref('')
  const inputOrderEmail = ref('')
  const inputOrderName = ref('')
  const inputOrderAsin = ref('')

  let scheduleSmtpDraft = null
  let scheduleTickRunning = false
  let activeImage = null
  let isResizing = false
  let startX = 0
  let startWidth = 0

  function toast(msg, type = 'info') {
    const container = toastContainerEl
    if (!container) return
    const el = document.createElement('div')
    el.className = `toast ${
      type === 'success'
        ? 'toast-success'
        : type === 'warning'
          ? 'toast-warning'
          : type === 'error'
            ? 'toast-error'
            : ''
    }`
    el.textContent = msg
    container.appendChild(el)
    setTimeout(() => {
      el.style.opacity = '0'
      el.style.transform = 'translateY(10px)'
      setTimeout(() => el.remove(), 300)
    }, 4000)
  }

  function loadLocalData() {
    try {
      const localTpl = localStorage.getItem('amz_templates_data_v3')
      if (localTpl) Object.assign(TEMPLATES, JSON.parse(localTpl))
      const localAsin = localStorage.getItem('amz_asin_presets_v3')
      if (localAsin) asinPresets.value = JSON.parse(localAsin)
      const localOrder = localStorage.getItem('amz_order_data_v3')
      if (localOrder) orderData.value = JSON.parse(localOrder)
    } catch (e) {
      console.error('加载本地数据失败:', e)
    }
  }

  function saveAllDataToLocal() {
    try {
      localStorage.setItem('amz_templates_data_v3', JSON.stringify(TEMPLATES))
      localStorage.setItem('amz_asin_presets_v3', JSON.stringify(asinPresets.value))
      localStorage.setItem('amz_order_data_v3', JSON.stringify(orderData.value))
    } catch (e) {
      console.error('保存失败:', e)
      toast(
        '⚠️ 模板保存失败：插入的图片可能过大，超出了浏览器存储限制，请压缩图片后重试。',
        'error'
      )
    }
  }

  function getTplKey() {
    return `${currentMainTab.value}_${currentSubTab.value}`
  }

  function loadCurrentTemplate() {
    const key = getTplKey()
    const ed = emailEditorRef.value
    if (ed) ed.innerHTML = TEMPLATES[key].html || ''
    subjectInput.value = TEMPLATES[key].subject || ''
  }

  function saveCurrentTemplate() {
    const key = getTplKey()
    const ed = emailEditorRef.value
    if (ed) TEMPLATES[key].html = ed.innerHTML
    TEMPLATES[key].subject = subjectInput.value
    saveAllDataToLocal()
  }

  function switchMainTab(mainType) {
    saveCurrentTemplate()
    currentMainTab.value = mainType
    loadCurrentTemplate()
    updatePreview()
  }

  function switchSubTab(subType) {
    saveCurrentTemplate()
    currentSubTab.value = subType
    loadCurrentTemplate()
    updatePreview()
  }

  async function compileEmailData(order, isBatchMode = false) {
    const preset = asinPresets.value.find((a) => a.asin === order.asin)
    const subType = preset ? 'asin' : 'no'
    const tplKey = `${currentMainTab.value}_${subType}`
    let html = TEMPLATES[tplKey].html
    let subject = TEMPLATES[tplKey].subject

    html = html.replace(
      /<span class="variable-tag[^"]*" contenteditable="false">([^<]*)<\/span>/gi,
      '$1'
    )
    html = html.replace(/box-shadow: 0 0 0 2px #A1A1AA;/gi, '')

    const replaceVars = (text) => {
      let res = text.replace(
        /\{收件人名称\}/g,
        isBatchMode ? 'Customer' : order.recipientName || 'Customer'
      )
      res = res.replace(/\{订单号\}/g, isBatchMode ? '' : order.orderNumber)
      res = res.replace(/\{ASIN\}/g, order.asin || '')
      res = res.replace(/\{产品名称\}/g, preset ? preset.productName : order.asin || '')
      let targetLink = GENERAL_REVIEW_LINK
      if (preset && preset.reviewLink) targetLink = preset.reviewLink
      else if (preset && !preset.reviewLink)
        targetLink = `https://www.amazon.com/review/create-review?&asin=${preset.asin}`
      res = res.replace(/\{留评链接\}/g, targetLink)
      return { res, targetLink }
    }

    const compiledHtmlInfo = replaceVars(html)
    html = compiledHtmlInfo.res
    subject = replaceVars(subject).res

    if (html.includes('{留评二维码}')) {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(compiledHtmlInfo.targetLink)}`
      html = html.replace(
        /\{留评二维码\}/g,
        `<img src="${qrUrl}" width="150" height="150" style="border-radius:4px; border:1px solid #E4E4E7; padding:4px; background:white; display:block; margin: 10px auto;">`
      )
    }

    return { html, subject }
  }

  async function updatePreview() {
    const idx = previewOrderSelect.value
    if (idx === '' || idx === null) {
      previewHtml.value = ''
      return
    }
    const data = await compileEmailData(orderData.value[parseInt(idx, 10)])
    previewHtml.value = data.html
  }

  watch(previewOrderSelect, updatePreview)

  watch(
    orderData,
    () => {
      const idx = parseInt(previewOrderSelect.value, 10)
      if (
        previewOrderSelect.value !== '' &&
        (Number.isNaN(idx) || idx < 0 || idx >= orderData.value.length)
      ) {
        previewOrderSelect.value = ''
        previewHtml.value = ''
      }
    },
    { deep: true }
  )

  function formatDoc(cmd, value = null) {
    const ed = emailEditorRef.value
    if (ed) ed.focus()
    document.execCommand(cmd, false, value)
    saveCurrentTemplate()
    updatePreview()
  }

  function insertVariable(text) {
    const editor = emailEditorRef.value
    if (!editor) return
    editor.focus()
    const tagClass = text.includes('二维码') ? 'variable-tag qr-tag' : 'variable-tag'
    const htmlToInsert = `<span class="${tagClass}" contenteditable="false">${text}</span>&nbsp;`
    const sel = window.getSelection()
    if (sel && sel.getRangeAt && sel.rangeCount) {
      let range = sel.getRangeAt(0)
      range.deleteContents()
      const el = document.createElement('div')
      el.innerHTML = htmlToInsert
      const frag = document.createDocumentFragment()
      let node
      let lastNode = null
      while ((node = el.firstChild)) lastNode = frag.appendChild(node)
      range.insertNode(frag)
      if (lastNode) {
        range = range.cloneRange()
        range.setStartAfter(lastNode)
        range.collapse(true)
        sel.removeAllRanges()
        sel.addRange(range)
      }
    }
    saveCurrentTemplate()
    updatePreview()
  }

  function getImgbbApiKey() {
    const k = localStorage.getItem(IMGBB_API_KEY_STORAGE)
    if (k && k.trim()) return k.trim()
    return ''
  }

  function isLikelyImageFile(f) {
    if (!f) return false
    if (f.type && f.type.startsWith('image/')) return true
    if (f.name && /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif)$/i.test(f.name)) return true
    return false
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result)
      r.onerror = () => reject(new Error('读取文件失败'))
      r.readAsDataURL(file)
    })
  }

  async function uploadToImgbbBase64(base64Body, apiKey) {
    const form = new FormData()
    form.append('key', apiKey)
    form.append('image', base64Body)
    const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form })
    const text = await res.text()
    let json
    try {
      json = JSON.parse(text)
    } catch {
      throw new Error(`图床返回异常 ${res.status}：${text.slice(0, 200)}`)
    }
    if (!json.success) {
      const errObj = json.error
      const msg =
        (errObj && (errObj.message || errObj.msg || errObj)) ||
        json.status_txt ||
        `HTTP ${res.status}`
      throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg || json))
    }
    const url = json.data && (json.data.url || json.data.display_url)
    if (!url) throw new Error('图床未返回图片地址')
    return url
  }

  function insertImageAtCursor(src) {
    const editor = emailEditorRef.value
    if (!editor) return
    editor.focus()
    const img = document.createElement('img')
    img.src = src
    img.style.maxWidth = '100%'
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      let range = sel.getRangeAt(0)
      range.deleteContents()
      range.insertNode(img)
      range = range.cloneRange()
      range.setStartAfter(img)
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
    } else {
      editor.appendChild(img)
    }
    saveCurrentTemplate()
    updatePreview()
  }

  async function ingestImageFiles(fileList) {
    const key = getImgbbApiKey()
    if (!key) {
      toast('请先在「图床设置」中填写 ImgBB API Key', 'warning')
      imgbbModalOpen.value = true
      imgbbApiKeyInput.value = ''
      return
    }
    const files = Array.from(fileList || []).filter(isLikelyImageFile)
    if (files.length === 0) return
    toast(`正在上传 ${files.length} 张图片到图床…`, 'info')
    let ok = 0
    for (const file of files) {
      try {
        const dataUrl = await fileToBase64(file)
        const b64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
        const url = await uploadToImgbbBase64(b64, key)
        insertImageAtCursor(url)
        ok++
      } catch (e) {
        console.error(e)
        toast(`上传失败：${e.message || '未知错误'}`, 'error')
        break
      }
    }
    if (ok > 0) toast(`已插入 ${ok} 张图（公网链接）`, 'success')
  }

  async function promoteDataImagesInEditor() {
    const editor = emailEditorRef.value
    if (!editor) return
    const imgs = Array.from(editor.querySelectorAll('img[src^="data:"]'))
    if (imgs.length === 0) {
      toast('正文中没有 base64 图片', 'warning')
      return
    }
    const key = getImgbbApiKey()
    if (!key) {
      toast('请先在「图床设置」中填写 ImgBB API Key', 'warning')
      imgbbModalOpen.value = true
      return
    }
    toast(`正在将 ${imgs.length} 张图上传到图床…`, 'info')
    let ok = 0
    for (const img of imgs) {
      const src = img.getAttribute('src') || ''
      const idx = src.indexOf('base64,')
      if (idx === -1) continue
      const b64 = src.slice(idx + 'base64,'.length)
      try {
        const url = await uploadToImgbbBase64(b64, key)
        img.src = url
        ok++
      } catch (e) {
        console.error(e)
        toast(`部分图片上传失败：${e.message || ''}`, 'error')
        break
      }
    }
    saveCurrentTemplate()
    updatePreview()
    if (ok > 0) toast(`已替换 ${ok} 张图为图床链接`, 'success')
  }

  function updateResizerPosition() {
    const resizerOverlay = imageResizerRef.value
    const editorWrapper = editorWrapperRef.value
    if (!resizerOverlay || !editorWrapper) return
    if (!activeImage) {
      resizerOverlay.style.display = 'none'
      return
    }
    resizerOverlay.style.display = 'block'
    const wrapperRect = editorWrapper.getBoundingClientRect()
    const imgRect = activeImage.getBoundingClientRect()
    resizerOverlay.style.top = `${imgRect.top - wrapperRect.top}px`
    resizerOverlay.style.left = `${imgRect.left - wrapperRect.left}px`
    resizerOverlay.style.width = `${imgRect.width}px`
    resizerOverlay.style.height = `${imgRect.height}px`
  }

  function handleMouseMove(e) {
    if (!isResizing || !activeImage) return
    const dx = e.clientX - startX
    let newWidth = startWidth + dx
    if (newWidth < 50) newWidth = 50
    activeImage.style.width = `${newWidth}px`
    activeImage.style.height = 'auto'
    updateResizerPosition()
  }

  function handleMouseUp() {
    isResizing = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    saveCurrentTemplate()
    updatePreview()
  }

  function boundResizerHandleDown(e) {
    e.preventDefault()
    e.stopPropagation()
    if (!activeImage) return
    isResizing = true
    startX = e.clientX
    startWidth = activeImage.getBoundingClientRect().width
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  function clearOrders() {
    if (orderData.value.length === 0) return
    if (confirm('确定要一键清空当前所有数据源队列吗？此操作不可恢复。')) {
      orderData.value = []
      saveAllDataToLocal()
      updatePreview()
      toast('队列已成功清空', 'success')
    }
  }

  function manualSaveTemplate() {
    saveCurrentTemplate()
    toast('模板已成功保存', 'success')
  }

  function onSubjectInput() {
    saveCurrentTemplate()
    updatePreview()
  }

  function triggerImgbbFilePick() {
    imgbbFileInputRef.value?.click()
  }

  function openAsinManager() {
    asinManagerOpen.value = true
  }
  function closeAsinManager() {
    asinManagerOpen.value = false
  }

  function saveAsin() {
    const asin = inputAsin.value.trim()
    const name = inputProductName.value.trim()
    if (!asin) {
      alert('ASIN 为必填项，无法添加')
      return
    }
    asinPresets.value.push({
      asin,
      productName: name,
      reviewLink: inputReviewLink.value.trim(),
    })
    inputAsin.value = ''
    inputProductName.value = ''
    inputReviewLink.value = ''
    saveAllDataToLocal()
    toast('规则已添加', 'success')
  }

  function deleteAsin(idx) {
    asinPresets.value.splice(idx, 1)
    saveAllDataToLocal()
    updatePreview()
  }

  function openOrderModal() {
    orderModalOpen.value = true
  }
  function closeOrderModal() {
    orderModalOpen.value = false
  }

  function saveOrder() {
    const orderNumber = inputOrderNum.value.trim()
    const email = inputOrderEmail.value.trim()
    const asin = inputOrderAsin.value.trim()
    if (!orderNumber || !email) {
      alert('订单号和邮箱地址为必填项')
      return
    }
    orderData.value.push({
      orderNumber,
      recipientEmail: email,
      recipientName: inputOrderName.value || 'Customer',
      asin,
    })
    inputOrderNum.value = ''
    inputOrderEmail.value = ''
    saveAllDataToLocal()
    closeOrderModal()
    toast('任务已追加到队列', 'success')
  }

  function deleteOrder(idx) {
    orderData.value.splice(idx, 1)
    saveAllDataToLocal()
    updatePreview()
  }

  function downloadOrderCsvTemplate() {
    const csvContent =
      '订单号,目标邮箱地址,收件人姓名,关联ASIN\n114-1234567-0000001,customer@email.com,John Doe,B08XYZ123'
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, '数据源导入模板.csv')
  }

  function importOrdersCSV() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv'
    input.onchange = (e) => {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target.result
        const rows = text.split('\n').filter((row) => row.trim() !== '')
        let added = 0
        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
          if (cols.length >= 2 && cols[0] && cols[1]) {
            orderData.value.push({
              orderNumber: cols[0],
              recipientEmail: cols[1],
              recipientName: cols[2] || 'Customer',
              asin: cols[3] || '',
            })
            added++
          }
        }
        saveAllDataToLocal()
        toast(`成功导入 ${added} 条订单数据`, 'success')
      }
      reader.readAsText(file)
    }
    input.click()
  }

  function downloadAsinCsvTemplate() {
    const csvContent =
      'ASIN,产品名称,留评链接(选填)\nB08XYZ123,便携式耳机,https://www.amazon.com/review/create-review?asin=B08XYZ123'
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, 'ASIN匹配规则导入模板.csv')
  }

  function importAsinCSV() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv'
    input.onchange = (e) => {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target.result
        const rows = text.split('\n').filter((row) => row.trim() !== '')
        let added = 0
        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
          if (cols.length >= 1 && cols[0]) {
            asinPresets.value.push({
              asin: cols[0],
              productName: cols[1] || '',
              reviewLink: cols[2] || '',
            })
            added++
          }
        }
        saveAllDataToLocal()
        toast(`成功导入 ${added} 条 ASIN 匹配规则`, 'success')
      }
      reader.readAsText(file)
    }
    input.click()
  }

  async function writeRichTextToClipboard(htmlString) {
    return new Promise((resolve) => {
      const el = document.createElement('div')
      el.innerHTML = `<div style="background-color: #ffffff; color: #000000; font-family: 'Microsoft YaHei', Arial, sans-serif; font-size: 14px;">${htmlString}</div>`
      el.style.position = 'fixed'
      el.style.left = '-9999px'
      el.style.backgroundColor = '#ffffff'
      document.body.appendChild(el)
      const selection = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(el)
      selection.removeAllRanges()
      selection.addRange(range)
      let success = false
      try {
        success = document.execCommand('copy')
      } catch (err) {
        console.error(err)
      }
      selection.removeAllRanges()
      document.body.removeChild(el)
      resolve(success)
    })
  }

  function loadScheduledJobs() {
    try {
      const raw = localStorage.getItem(SCHEDULED_SMTP_STORAGE)
      const arr = raw ? JSON.parse(raw) : []
      return Array.isArray(arr) ? arr : []
    } catch {
      return []
    }
  }

  function saveScheduledJobs(jobs) {
    try {
      localStorage.setItem(SCHEDULED_SMTP_STORAGE, JSON.stringify(jobs))
    } catch (e) {
      console.error(e)
      toast('定时队列保存失败（可能超出存储空间）', 'error')
    }
  }

  function refreshScheduledUi() {
    const jobs = loadScheduledJobs().sort((a, b) => a.fireAt - b.fireAt)
    scheduledJobsDisplay.value = jobs
    scheduledWrapVisible.value = jobs.length > 0
    const n = jobs.length
    if (n === 0) {
      scheduledBadgeText.value = ''
    } else {
      scheduledBadgeText.value = `定时 SMTP: ${n} 封（需保持页面打开）`
    }
  }

  async function performSmtpSend(sampleOrder, bccList) {
    const bcc = Array.isArray(bccList)
      ? bccList.map((e) => (typeof e === 'string' ? e.trim() : '')).filter(Boolean)
      : []
    if (bcc.length === 0) return { ok: false, code: 'NO_BCC' }
    let mailData
    try {
      mailData = await compileEmailData(sampleOrder, true)
    } catch (err) {
      console.error(err)
      return { ok: false, code: 'COMPILE', message: err.message || String(err) }
    }
    try {
      const res = await apiFetch('/api/send-mail/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: mailData.subject, html: mailData.html, bcc }),
      })
      let data = {}
      try {
        data = await res.json()
      } catch (_) {
        /* ignore */
      }
      if (res.status === 401) {
        router.push({ name: 'login' })
        return { ok: false, code: 'UNAUTHORIZED' }
      }
      if (!res.ok) {
        const errMsg = (data && (data.error || data.message)) || `HTTP ${res.status}`
        return {
          ok: false,
          code: 'HTTP',
          message: typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg),
        }
      }
      return { ok: true, data }
    } catch (e) {
      return { ok: false, code: 'NETWORK', message: e.message || String(e) }
    }
  }

  async function runScheduledJob(job) {
    const label = job.label || '定时任务'
    const r = await performSmtpSend(job.sampleOrder, job.bcc)
    if (r.ok) toast(`定时发送成功：${label}`, 'success')
    else {
      let detail = r.message || r.code || '未知错误'
      toast(`定时发送失败「${label}」：${detail}`, 'error')
    }
    refreshScheduledUi()
  }

  function tickScheduledSmtp() {
    if (scheduleTickRunning) return
    scheduleTickRunning = true
    ;(async () => {
      try {
        const now = Date.now()
        let jobs = loadScheduledJobs()
        const due = jobs.filter((j) => j.fireAt <= now).sort((a, b) => a.fireAt - b.fireAt)
        const future = jobs.filter((j) => j.fireAt > now)
        if (due.length === 0) return
        saveScheduledJobs(future)
        for (const job of due) await runScheduledJob(job)
      } finally {
        scheduleTickRunning = false
      }
    })()
  }

  function formatForDatetimeLocal(d) {
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  function openScheduleSmtpModal(sampleOrder, bccList, label) {
    const bcc = Array.isArray(bccList)
      ? bccList.map((e) => (typeof e === 'string' ? e.trim() : '')).filter(Boolean)
      : []
    if (bcc.length === 0) {
      toast('该组没有有效收件邮箱', 'warning')
      return
    }
    scheduleSmtpDraft = { sampleOrder, bcc, label: label || '邮件组' }
    scheduleSmtpTaskTitle.value = scheduleSmtpDraft.label
    const dt = new Date(Date.now() + 60 * 60 * 1000)
    scheduleSmtpDatetime.value = formatForDatetimeLocal(dt)
    scheduleSmtpModalOpen.value = true
  }

  function closeScheduleSmtpModal() {
    scheduleSmtpModalOpen.value = false
    scheduleSmtpDraft = null
  }

  function confirmScheduleSmtp() {
    if (!scheduleSmtpDraft) {
      closeScheduleSmtpModal()
      return
    }
    const input = scheduleSmtpDatetime.value
    const fireAt = new Date(input).getTime()
    if (!input || Number.isNaN(fireAt)) {
      toast('请选择有效的发送时间', 'warning')
      return
    }
    const minAt = Date.now() + 25 * 1000
    if (fireAt < minAt) {
      toast('发送时间需至少晚于当前约 30 秒', 'warning')
      return
    }
    let jobs = loadScheduledJobs()
    if (jobs.length >= SCHEDULED_SMTP_MAX) {
      toast(`定时队列已满（最多 ${SCHEDULED_SMTP_MAX} 条），请先取消部分任务`, 'warning')
      return
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    jobs.push({
      id,
      fireAt,
      label: scheduleSmtpDraft.label,
      sampleOrder: scheduleSmtpDraft.sampleOrder,
      bcc: scheduleSmtpDraft.bcc.slice(),
    })
    saveScheduledJobs(jobs)
    refreshScheduledUi()
    toast(
      `已加入定时队列：${scheduleSmtpDraft.label} · ${new Date(fireAt).toLocaleString()}`,
      'success'
    )
    closeScheduleSmtpModal()
  }

  function cancelScheduledSmtp(id) {
    if (!id) return
    const jobs = loadScheduledJobs().filter((j) => j.id !== id)
    saveScheduledJobs(jobs)
    refreshScheduledUi()
    toast('已取消定时任务', 'success')
  }

  function openDispatchCenter() {
    if (orderData.value.length === 0) {
      alert('队列为空，请先添加收件人数据！')
      return
    }
    const groupMap = {}
    orderData.value.forEach((order) => {
      if (!order.recipientEmail) return
      const hasMatch = asinPresets.value.find((a) => a.asin === order.asin)
      const groupKey = hasMatch ? order.asin : 'NO_ASIN_GENERAL'
      if (!groupMap[groupKey]) groupMap[groupKey] = []
      groupMap[groupKey].push(order)
    })
    dispatchGroups.value = Object.keys(groupMap).map((key) => {
      const groupOrders = groupMap[key]
      const emailsJoined = groupOrders.map((o) => o.recipientEmail).join(';')
      const title =
        key === 'NO_ASIN_GENERAL' ? `通用邮件组 (未匹配具体ASIN)` : `专供 ASIN: ${key}`
      const sampleOrder = groupOrders[0]
      const bccList = groupOrders.map((o) => o.recipientEmail)
      return { key, title, emailsJoined, sampleOrder, bccList }
    })
    refreshScheduledUi()
    dispatchModalOpen.value = true
  }

  function closeDispatchCenter() {
    dispatchModalOpen.value = false
  }

  async function executeMailtoBatch(sampleOrder, emailsJoined) {
    const mailData = await compileEmailData(sampleOrder, true)
    await writeRichTextToClipboard(mailData.html)
    toast('✅ 邮件排版已成功复制进剪贴板！请在弹出的发件窗口按 Ctrl+V 粘贴内容。', 'success')
    const mailtoLink = `mailto:?bcc=${emailsJoined}&subject=${encodeURIComponent(mailData.subject)}`
    setTimeout(() => {
      window.location.href = mailtoLink
    }, 500)
  }

  async function executeSmtpBatch(sampleOrder, bccList) {
    const bcc = Array.isArray(bccList)
      ? bccList.map((e) => (typeof e === 'string' ? e.trim() : '')).filter(Boolean)
      : []
    if (bcc.length === 0) {
      toast('该组没有有效收件邮箱', 'warning')
      return
    }
    toast(`正在通过 SMTP 发送（最多 ${bcc.length} 人 BCC）…`, 'info')
    const r = await performSmtpSend(sampleOrder, bccList)
    if (r.ok) {
      toast(r.data && r.data.message ? r.data.message : 'SMTP 发送成功', 'success')
      return
    }
    if (r.code === 'NO_BCC') {
      toast('该组没有有效收件邮箱', 'warning')
      return
    }
    toast(`SMTP 发送失败：${r.message || r.code || '未知错误'}`, 'error')
  }

  function openImgbbSettingsModal() {
    imgbbApiKeyInput.value = getImgbbApiKey()
    imgbbModalOpen.value = true
  }
  function closeImgbbSettingsModal() {
    imgbbModalOpen.value = false
  }
  function saveImgbbSettings() {
    const v = imgbbApiKeyInput.value.trim()
    if (v) localStorage.setItem(IMGBB_API_KEY_STORAGE, v)
    else localStorage.removeItem(IMGBB_API_KEY_STORAGE)
    toast(v ? '图床 Key 已保存' : '已清除图床 Key', 'success')
    closeImgbbSettingsModal()
  }

  async function logout() {
    await apiFetch('/api/auth/logout/', { method: 'POST' })
    router.push({ name: 'login' })
  }

  let scheduleIntervalId = null

  onMounted(() => {
    loadLocalData()
    loadCurrentTemplate()

    nextTick(() => {
      const editor = emailEditorRef.value
      if (editor) {
        editor.addEventListener('input', () => {
          saveCurrentTemplate()
          updatePreview()
        })
      }

    const onEditorClick = (e) => {
      const editorWrapper = editorWrapperRef.value
      const resizerOverlay = imageResizerRef.value
      if (!editorWrapper || !resizerOverlay) return
      if (e.target.tagName === 'IMG' && !e.target.closest('.variable-tag')) {
        activeImage = e.target
        updateResizerPosition()
      } else {
        activeImage = null
        updateResizerPosition()
      }
    }

    const onDocClick = (e) => {
      const editorWrapper = editorWrapperRef.value
      if (!editorWrapper || editorWrapper.contains(e.target)) return
      activeImage = null
      updateResizerPosition()
    }

    const onEditorScroll = () => {
      if (activeImage) updateResizerPosition()
    }

    const onPaste = (e) => {
      const cd = e.clipboardData
      if (!cd) return
      const imageFiles = []
      if (cd.files && cd.files.length) {
        for (let i = 0; i < cd.files.length; i++) {
          const f = cd.files[i]
          if (isLikelyImageFile(f)) imageFiles.push(f)
        }
      }
      if (imageFiles.length === 0 && cd.items && cd.items.length) {
        for (let i = 0; i < cd.items.length; i++) {
          const it = cd.items[i]
          if (it.kind === 'file' && it.type && it.type.indexOf('image') !== -1) {
            const f = it.getAsFile()
            if (f) imageFiles.push(f)
          }
        }
      }
      if (imageFiles.length === 0) return
      e.preventDefault()
      e.stopPropagation()
      ingestImageFiles(imageFiles)
    }

    const onDragOver = (ev) => ev.preventDefault()
    const onDrop = (ev) => {
      ev.preventDefault()
      if (ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files.length)
        ingestImageFiles(ev.dataTransfer.files)
    }

      if (editor) {
        editor.addEventListener('click', onEditorClick)
        editor.addEventListener('paste', onPaste)
        editor.addEventListener('dragover', onDragOver)
        editor.addEventListener('drop', onDrop)
        editor.addEventListener('scroll', onEditorScroll)
      }

      document.addEventListener('click', onDocClick)
      window.addEventListener('resize', updateResizerPosition)

      const rh = resizerHandleRef.value
      if (rh) rh.addEventListener('mousedown', boundResizerHandleDown)

      const imgInput = imgbbFileInputRef.value
      if (imgInput) {
        imgInput.addEventListener('change', (ev) => {
          const fl = ev.target.files
          ev.target.value = ''
          if (fl && fl.length) ingestImageFiles(fl)
        })
      }
    })

    refreshScheduledUi()
    scheduleIntervalId = setInterval(() => {
      tickScheduledSmtp()
      refreshScheduledUi()
    }, SCHEDULE_TICK_MS)
    tickScheduledSmtp()
  })

  onUnmounted(() => {
    if (scheduleIntervalId) clearInterval(scheduleIntervalId)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  })

  return {
    asinPresets,
    orderData,
    currentMainTab,
    currentSubTab,
    subjectInput,
    emailEditorRef,
    editorWrapperRef,
    imageResizerRef,
    resizerHandleRef,
    previewOrderSelect,
    previewHtml,
    dispatchGroups,
    scheduledJobsDisplay,
    scheduledWrapVisible,
    scheduledBadgeText,
    asinManagerOpen,
    dispatchModalOpen,
    orderModalOpen,
    scheduleSmtpModalOpen,
    imgbbModalOpen,
    imgbbFileInputRef,
    imgbbApiKeyInput,
    scheduleSmtpTaskTitle,
    scheduleSmtpDatetime,
    statTotal,
    statHitRate,
    inputAsin,
    inputProductName,
    inputReviewLink,
    inputOrderNum,
    inputOrderEmail,
    inputOrderName,
    inputOrderAsin,
    switchMainTab,
    switchSubTab,
    formatDoc,
    insertVariable,
    clearOrders,
    manualSaveTemplate,
    onSubjectInput,
    triggerImgbbFilePick,
    openAsinManager,
    closeAsinManager,
    saveAsin,
    deleteAsin,
    openOrderModal,
    closeOrderModal,
    saveOrder,
    deleteOrder,
    downloadOrderCsvTemplate,
    importOrdersCSV,
    downloadAsinCsvTemplate,
    importAsinCSV,
    openDispatchCenter,
    closeDispatchCenter,
    executeMailtoBatch,
    executeSmtpBatch,
    openScheduleSmtpModal,
    closeScheduleSmtpModal,
    confirmScheduleSmtp,
    cancelScheduledSmtp,
    openImgbbSettingsModal,
    closeImgbbSettingsModal,
    saveImgbbSettings,
    promoteDataImagesInEditor,
    ingestImageFiles,
    logout,
  }
}
