<template>
  <div class="page-container">
    <div class="top-bar">
      <div class="brand">
        <div class="brand-text">
          <h1>索评邮件管理控制台</h1>
        </div>
      </div>
      <div class="top-actions">
        <button type="button" class="btn btn-ghost btn-sm" @click="logout">退出登录</button>
        <button type="button" class="btn btn-outline" @click="openAsinManager">⚙️ ASIN 匹配</button>
        <span
          v-if="scheduledBadgeText"
          style="font-size: 0.8rem; color: var(--text-muted)"
          title="本页保持打开时才会在预定时间发送"
          >{{ scheduledBadgeText }}</span
        >
        <button
          type="button"
          class="btn btn-primary"
          style="font-size: 0.95rem; padding: 10px 20px"
          @click="openDispatchCenter"
        >
          🚀 群发
        </button>
      </div>
    </div>

    <div class="main-workspace">
      <div class="workspace-top">
        <div style="display: flex; flex-direction: column; gap: 24px; height: 100%; min-height: 0">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; flex-shrink: 0">
            <div
              style="
                background: var(--bg-surface);
                padding: 20px;
                border-radius: var(--radius-md);
                border: 1px solid var(--border-color);
              "
            >
              <div style="color: var(--text-muted); font-size: 0.8rem; margin-bottom: 8px">
                队列总人数 (独立邮箱)
              </div>
              <div style="font-size: 1.75rem; font-weight: 600; color: var(--text-main)">
                {{ statTotal }}
              </div>
            </div>
            <div
              style="
                background: var(--bg-surface);
                padding: 20px;
                border-radius: var(--radius-md);
                border: 1px solid var(--border-color);
              "
            >
              <div style="color: var(--text-muted); font-size: 0.8rem; margin-bottom: 8px">
                已匹配 ASIN 数据
              </div>
              <div style="font-size: 1.75rem; font-weight: 600; color: var(--success)">
                {{ statHitRate }}
              </div>
            </div>
          </div>

          <div class="panel" style="flex: 1; min-height: 0; display: flex; flex-direction: column">
            <div class="panel-header">
              <span>数据源队列</span>
              <div style="display: flex; gap: 8px">
                <button
                  type="button"
                  class="btn btn-sm btn-ghost"
                  style="color: var(--danger)"
                  @click="clearOrders"
                >
                  一键清空
                </button>
                <button type="button" class="btn btn-sm btn-outline" @click="downloadOrderCsvTemplate">
                  下载模板
                </button>
                <button type="button" class="btn btn-sm btn-outline" @click="importOrdersCSV">
                  导入 CSV
                </button>
                <button type="button" class="btn btn-sm btn-outline" @click="openOrderModal">
                  手动录入
                </button>
              </div>
            </div>
            <div class="panel-body" style="flex: 1; overflow-y: auto; min-height: 0">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>订单与ASIN</th>
                    <th>目标邮箱</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="orderData.length === 0">
                    <td colspan="3" style="text-align: center; color: var(--text-muted); padding: 48px 0">
                      队列为空，请导入数据
                    </td>
                  </tr>
                  <tr v-for="(o, i) in orderData" v-else :key="i">
                    <td>
                      <div style="font-weight: 500">{{ o.orderNumber }}</div>
                      <div
                        style="
                          font-size: 0.75rem;
                          color: var(--text-muted);
                          margin-top: 4px;
                          display: flex;
                          gap: 8px;
                          align-items: center;
                        "
                      >
                        ASIN: {{ o.asin || '无' }}
                        <span v-if="asinPresets.some((a) => a.asin === o.asin)" class="badge badge-success"
                          >匹配</span
                        >
                        <span v-else class="badge badge-warning">未提供</span>
                      </div>
                    </td>
                    <td style="font-family: monospace">
                      {{ o.recipientEmail || '—' }}
                    </td>
                    <td>
                      <button type="button" class="btn btn-sm btn-ghost" @click="deleteOrder(i)">移除</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="panel" style="display: flex; flex-direction: column; height: 100%">
          <div class="tabs-container">
            <div class="main-tabs">
              <div
                class="main-tab"
                :class="{ active: currentMainTab === 'warranty' }"
                @click="switchMainTab('warranty')"
              >
                🔒 延保复盘
              </div>
              <div class="main-tab" :class="{ active: currentMainTab === 'bags' }" @click="switchMainTab('bags')">
                📦 包材复盘
              </div>
            </div>
            <div class="sub-tabs">
              <div
                class="sub-tab"
                :class="{ active: currentSubTab === 'asin' }"
                @click="switchSubTab('asin')"
              >
                针对【匹配到具体ASIN】的用户
              </div>
              <div class="sub-tab" :class="{ active: currentSubTab === 'no' }" @click="switchSubTab('no')">
                针对【未提供ASIN】的用户
              </div>
            </div>
          </div>

          <div class="toolbar">
            <div class="var-row">
              <div class="var-group">
                <span class="var-chip" @click="insertVariable('{收件人名称}')">👤 收件人</span>
                <span class="var-chip" @click="insertVariable('{订单号}')">📦 订单号</span>
                <span class="var-chip" @click="insertVariable('{ASIN}')">🏷️ ASIN</span>
                <span class="var-chip" @click="insertVariable('{产品名称}')">📝 产品名</span>
                <span class="var-chip" @click="insertVariable('{留评链接}')">🔗 链接</span>
                <span class="var-chip qr-chip" @click="insertVariable('{留评二维码}')">📱 二维码</span>
              </div>
              <button type="button" class="btn btn-sm btn-outline" @click="openImgbbSettingsModal">
                🖼️ 图床设置
              </button>
              <button type="button" class="btn btn-sm btn-outline" @click="triggerImgbbFilePick">
                ⬆️ 上传图片
              </button>
              <button type="button" class="btn btn-sm btn-primary" @click="manualSaveTemplate">
                💾 保存当前模板
              </button>
            </div>

            <div class="format-row" style="width: 100%">
              <button type="button" class="format-btn" title="加粗" @click="formatDoc('bold')"><b>B</b></button>
              <button type="button" class="format-btn" title="斜体" @click="formatDoc('italic')"><i>I</i></button>
              <button type="button" class="format-btn" title="下划线" @click="formatDoc('underline')"><u>U</u></button>
              <div style="width: 1px; height: 16px; background: var(--border-color); margin: 0 4px"></div>
              <span style="font-size: 0.75rem; color: var(--text-main)">颜色:</span>
              <input type="color" class="format-color" title="字体颜色" @change="formatDoc('foreColor', $event.target.value)" />
              <span style="font-size: 0.75rem; color: var(--text-main); margin-left: 4px">大小:</span>
              <select class="format-select" title="字体大小" @change="formatDoc('fontSize', $event.target.value)">
                <option value="1">极小</option>
                <option value="2">小</option>
                <option value="3" selected>正常</option>
                <option value="4">中等</option>
                <option value="5">大</option>
                <option value="6">特大</option>
              </select>
              <div style="width: 1px; height: 16px; background: var(--border-color); margin: 0 4px"></div>
              <button
                type="button"
                class="format-btn"
                style="margin-left: auto; font-weight: normal"
                @click="formatDoc('removeFormat')"
              >
                清除格式
              </button>
            </div>
          </div>

          <div style="padding: 16px 24px 0; border-bottom: 1px solid var(--border-color); padding-bottom: 16px; flex-shrink: 0">
            <input
              v-model="subjectInput"
              type="text"
              class="input-elegant"
              placeholder="输入邮件主题..."
              @input="onSubjectInput"
            />
          </div>

          <div id="editorWrapper" ref="editorWrapperRef" class="editor-wrapper">
            <div ref="emailEditorRef" class="email-editor" contenteditable="true"></div>
            <div
              id="imageResizer"
              ref="imageResizerRef"
              style="
                display: none;
                position: absolute;
                border: 2px dashed var(--primary);
                pointer-events: none;
                z-index: 50;
              "
            >
              <div
                id="resizerHandle"
                ref="resizerHandleRef"
                style="
                  position: absolute;
                  width: 12px;
                  height: 12px;
                  background: var(--primary);
                  right: -7px;
                  bottom: -7px;
                  cursor: se-resize;
                  pointer-events: auto;
                  border-radius: 2px;
                  box-shadow: 0 0 0 2px white;
                "
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div class="panel" style="background: #fafafa">
        <div class="panel-header" style="background: transparent">
          <span>发送预览</span>
          <select v-model="previewOrderSelect" class="input-elegant" style="width: 250px; padding: 6px 10px">
            <option value="">-- 选择队列中的人 --</option>
            <option v-for="(o, i) in orderData" :key="i" :value="String(i)">
              {{ o.orderNumber }} ({{ o.recipientEmail }})
            </option>
          </select>
        </div>
        <div v-if="!previewHtml" class="preview-container">
          <div
            style="
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100%;
              color: var(--text-muted);
            "
          >
            <p>选中队列中的人员以预览专属生成效果</p>
          </div>
        </div>
        <div v-else class="preview-container" v-html="previewHtml"></div>
      </div>
    </div>

    <!-- ASIN -->
    <div class="modal-overlay" :class="{ active: asinManagerOpen }" @click.self="closeAsinManager">
      <div class="modal" style="max-width: 650px">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px">
          <h3 style="margin: 0">ASIN 匹配库</h3>
          <div style="display: flex; gap: 8px">
            <button type="button" class="btn btn-sm btn-outline" @click="downloadAsinCsvTemplate">下载模板</button>
            <button type="button" class="btn btn-sm btn-outline" @click="importAsinCSV">导入 CSV</button>
            <button type="button" class="btn btn-ghost btn-sm" @click="closeAsinManager">✕ 关闭</button>
          </div>
        </div>
        <div
          style="
            background: #fafafa;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            border: 1px solid var(--border-color);
          "
        >
          <div style="font-size: 0.8rem; font-weight: 600; margin-bottom: 12px">快捷新增映射</div>
          <div style="display: flex; gap: 12px; margin-bottom: 12px">
            <input v-model="inputAsin" type="text" class="input-elegant" placeholder="ASIN (必填)" />
            <input v-model="inputProductName" type="text" class="input-elegant" placeholder="产品展示名" />
          </div>
          <div style="display: flex; gap: 12px">
            <input
              v-model="inputReviewLink"
              type="text"
              class="input-elegant"
              placeholder="专用留评链接 (若不填则使用默认亚马逊后台链接)"
              style="flex: 1"
            />
            <button type="button" class="btn btn-primary" @click="saveAsin">+ 增加规则</button>
          </div>
        </div>
        <div style="max-height: 300px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 8px">
          <table class="data-table" style="margin: 0">
            <thead>
              <tr>
                <th>ASIN</th>
                <th>产品名称</th>
                <th style="width: 80px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="asinPresets.length === 0">
                <td colspan="3" style="text-align: center; color: var(--text-muted); padding: 24px">暂无匹配规则</td>
              </tr>
              <tr v-for="(a, i) in asinPresets" v-else :key="i">
                <td style="font-family: monospace; font-size: 0.85rem">{{ a.asin }}</td>
                <td>{{ a.productName }}</td>
                <td>
                  <button type="button" class="btn btn-sm btn-ghost" style="color: var(--danger)" @click="deleteAsin(i)">
                    移除
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 调度 -->
    <div class="modal-overlay" :class="{ active: dispatchModalOpen }" @click.self="closeDispatchCenter">
      <div class="modal" style="max-width: 650px">
        <div
          style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            flex-wrap: wrap;
            gap: 8px;
          "
        >
          <h3 style="margin: 0">发信调度中心 (群发单显)</h3>
          <div style="display: flex; gap: 8px; align-items: center">
            <button type="button" class="btn btn-ghost btn-sm" @click="closeDispatchCenter">✕ 关闭</button>
          </div>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px; line-height: 1.6">
          系统已根据队列人员是否匹配到 ASIN 自动划分为以下发件组。<br />
          <b>复制并打开邮箱</b>：复制正文并打开本机默认邮件客户端（如邮箱大师），需手动粘贴发送。<br />
          <b>SMTP 直接发送</b>：由已登录用户调用 Django 服务端 SMTP（需在服务器环境变量中配置 SMTP_*）。<br />
          <b>定时 SMTP</b>：到点自动调用同一接口发信；任务保存在本机，<span style="color: var(--warning)">需本页保持打开</span>。<br />
          <span style="color: var(--warning)">插图请用「图床设置」生成 https 链接</span>，避免客户端丢弃 base64 图。
        </p>

        <div
          v-show="scheduledWrapVisible"
          style="
            margin-bottom: 16px;
            background: #fafafa;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 12px 16px;
          "
        >
          <div style="font-size: 0.8rem; font-weight: 600; margin-bottom: 8px">定时 SMTP 队列</div>
          <ul style="list-style: none; margin: 0; padding: 0; font-size: 0.8rem">
            <li
              v-for="j in scheduledJobsDisplay"
              :key="j.id"
              style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid var(--border-color);
                gap: 8px;
              "
            >
              <span>{{ j.label }} · <span style="color: var(--text-muted)">{{ new Date(j.fireAt).toLocaleString() }}</span> ·
                {{ j.bcc?.length || 0 }} 人</span>
              <button
                type="button"
                class="btn btn-sm btn-ghost"
                style="color: var(--danger)"
                @click="cancelScheduledSmtp(j.id)"
              >
                取消
              </button>
            </li>
          </ul>
        </div>

        <div style="max-height: 450px; overflow-y: auto">
          <div v-for="(g, index) in dispatchGroups" :key="g.key" class="dispatch-item">
            <div class="dispatch-item-info">
              <strong>📦 任务 {{ index + 1 }}：{{ g.title }}</strong>
              <span
                >共计包含 <b style="color: var(--text-main)">{{ g.bccList.length }}</b> 个收件邮箱</span
              >
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px; align-items: stretch; min-width: 148px">
              <button type="button" class="btn btn-outline btn-sm" @click="executeMailtoBatch(g.sampleOrder, g.emailsJoined)">
                复制并打开邮箱
              </button>
              <button type="button" class="btn btn-primary btn-sm" @click="executeSmtpBatch(g.sampleOrder, g.bccList)">
                SMTP 直接发送
              </button>
              <button type="button" class="btn btn-outline btn-sm" @click="openScheduleSmtpModal(g.sampleOrder, g.bccList, g.title)">
                定时 SMTP
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 手动录入 -->
    <div class="modal-overlay" :class="{ active: orderModalOpen }" @click.self="closeOrderModal">
      <div class="modal">
        <h3>添加发送任务</h3>
        <div class="input-group"><label>订单号</label><input v-model="inputOrderNum" type="text" class="input-elegant" placeholder="000-0000000-0000000" /></div>
        <div class="input-group">
          <label>目标邮箱地址</label><input v-model="inputOrderEmail" type="email" class="input-elegant" placeholder="customer@email.com" />
        </div>
        <div class="input-group"><label>收件人姓名</label><input v-model="inputOrderName" type="text" class="input-elegant" placeholder="选填" /></div>
        <div class="input-group"><label>关联 ASIN</label><input v-model="inputOrderAsin" type="text" class="input-elegant" placeholder="可留空。如有则填入" /></div>
        <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px">
          <button type="button" class="btn btn-ghost" @click="closeOrderModal">取消</button>
          <button type="button" class="btn btn-primary" @click="saveOrder">确认添加</button>
        </div>
      </div>
    </div>

    <div ref="toastContainerRef" class="toast-container"></div>

    <input ref="imgbbFileInputRef" type="file" accept="image/*" multiple style="display: none" aria-hidden="true" />

    <!-- 定时 SMTP -->
    <div class="modal-overlay" :class="{ active: scheduleSmtpModalOpen }" @click.self="closeScheduleSmtpModal">
      <div class="modal" style="max-width: 480px">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
          <h3 style="margin: 0">定时 SMTP 发送</h3>
          <button type="button" class="btn btn-ghost btn-sm" @click="closeScheduleSmtpModal">✕ 关闭</button>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.6; margin-bottom: 12px">
          任务：<strong>{{ scheduleSmtpTaskTitle }}</strong><br />
          发送时将按<strong>当时模板</strong>重新编译正文（与「立即发送」一致）。请保持本页打开至预定时间。
        </p>
        <div class="input-group">
          <label>发送时间（本机时区）</label>
          <input v-model="scheduleSmtpDatetime" type="datetime-local" class="input-elegant" />
        </div>
        <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px">
          <button type="button" class="btn btn-ghost" @click="closeScheduleSmtpModal">取消</button>
          <button type="button" class="btn btn-primary" @click="confirmScheduleSmtp">加入队列</button>
        </div>
      </div>
    </div>

    <!-- ImgBB -->
    <div class="modal-overlay" :class="{ active: imgbbModalOpen }" @click.self="closeImgbbSettingsModal">
      <div class="modal" style="max-width: 560px">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
          <h3 style="margin: 0">图床设置（ImgBB）</h3>
          <button type="button" class="btn btn-ghost btn-sm" @click="closeImgbbSettingsModal">✕ 关闭</button>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.6; margin-bottom: 16px">
          免费注册后在
          <a href="https://api.imgbb.com/" target="_blank" rel="noopener noreferrer">api.imgbb.com</a> 获取 API
          Key。粘贴或上传的图片会先传到图床，正文里为 <code style="font-size: 0.8em">https://i.ibb.co/...</code>
          链接。
        </p>
        <div class="input-group">
          <label>ImgBB API Key</label>
          <input v-model="imgbbApiKeyInput" type="password" class="input-elegant" placeholder="粘贴你的 API Key" autocomplete="off" />
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; margin-top: 20px">
          <button type="button" class="btn btn-outline" @click="promoteDataImagesInEditor">将正文中 base64 图转为图床</button>
          <button type="button" class="btn btn-ghost" @click="closeImgbbSettingsModal">取消</button>
          <button type="button" class="btn btn-primary" @click="saveImgbbSettings">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useMailConsole } from './useMailConsole.js'

const toastContainerRef = ref(null)
const ctx = useMailConsole(toastContainerRef)

const {
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
  logout,
  triggerImgbbFilePick,
} = ctx
</script>
