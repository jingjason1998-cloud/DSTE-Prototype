/**
 * 企业微信通知消息模板渲染
 * @module notifications
 *
 * 纯函数：输入 (type, data) → 输出 markdown 格式消息字符串
 * 不涉及 DOM 操作、网络请求或状态管理
 */

import { renderPerson } from '../../lib/employee-directory.js';
import { icon } from '../../../assets/js/icons.js';

/**
 * 根据通知类型和数据渲染企业微信 markdown 消息
 * @param {string} type - 通知类型：'resolution' | 'todo' | 'alert-meeting' | 'alert-action' | 'agenda' | 'agenda-meeting' | 'rule-trigger'
 * @param {Object} data - 通知数据
 * @returns {string} markdown 格式消息内容
 */
export function renderNotificationMessage(type, data) {
  switch (type) {
    case 'resolution': {
      const statusColor =
        data.status === 'approved'
          ? 'info'
          : data.status === 'implemented'
            ? 'info'
            : 'warning';
      const statusText =
        data.status === 'approved'
          ? '已批准'
          : data.status === 'implemented'
            ? '已执行'
            : '待审批';
      return (
        `## ${icon('clipboardText', {size: 14})} 决议推送\n` +
        `**会议：**${data.meetingTitle}\n` +
        `**内容：**${data.content}\n` +
        `**负责人：**${renderPerson(data.owner)}\n` +
        `**截止日期：**${data.deadline || '未定'}\n` +
        `**状态：**<font color="${statusColor}">${statusText}</font>` +
        (data.kmsUrl ? `\n**KMS：**[查看文档](${data.kmsUrl})` : '')
      );
    }

    case 'todo': {
      const daysColor =
        data.daysLeft === undefined
          ? 'comment'
          : data.daysLeft < 0
            ? 'warning'
            : data.daysLeft <= 3
              ? 'warning'
              : 'info';
      const daysText =
        data.daysLeft !== undefined
          ? data.daysLeft < 0
            ? `已逾期 ${Math.abs(data.daysLeft)} 天`
            : `距截止还有 ${data.daysLeft} 天`
          : '若干天';
      return (
        `## ${icon('clock', {size: 14})} 待办提醒\n` +
        `**会议：**${data.meetingTitle}\n` +
        `**内容：**${data.content}\n` +
        `**负责人：**${renderPerson(data.owner)}\n` +
        `**截止日期：**${data.deadline || '未定'}\n` +
        `<font color="${daysColor}">${icon('hourglass', {size: 14})} ${daysText}</font>`
      );
    }

    case 'alert-meeting':
      return (
        `## ${icon('warning', {size: 14})} 会议预警\n` +
        `**会议：**${data.meetingTitle}\n` +
        `**问题：**${data.stepLabel} 尚未完成\n` +
        `**逾期：**<font color="warning">${data.daysOverdue} 天</font>\n` +
        `**会议日期：**${data.meetingDate}\n` +
        `> ${icon('lightbulb', {size: 14})} 请尽快推进！`
      );

    case 'alert-action':
      return (
        `## ${icon('warning', {size: 14})} 行动项预警\n` +
        `**会议：**${data.meetingTitle}\n` +
        `**行动项：**${data.content}\n` +
        `**负责人：**${renderPerson(data.owner)}\n` +
        `**截止日期：**${data.deadline}\n` +
        `<font color="warning">距截止仅剩 ${data.daysLeft} 天，请尽快闭环！</font>`
      );

    case 'agenda': {
      const modeTip = data.mode === 'material' ? '请提前准备议程材料' : data.mode === 'change' ? '议程信息已更新，请留意' : '请准时参加议程讨论';
      return (
        `## ${icon('clipboardText', {size: 14})} 议程通知\n` +
        `**会议：**${data.meetingTitle}\n` +
        `**议程：**${data.agendaTitle}\n` +
        `**类型：**${data.agendaType || '其他'}\n` +
        `**时长：**${data.duration || 0} 分钟\n` +
        `**负责人：**${renderPerson(data.owner)}\n` +
        (data.speaker ? `**演讲人：**${data.speaker}\n` : '') +
        (data.materialLink ? `**材料：**[查看材料](${data.materialLink})\n` : '') +
        `> ${icon('lightbulb', {size: 14})} ${modeTip}`
      );
    }

    case 'agenda-meeting': {
      const items = (data.agendaItems || []).map((a, i) =>
        `${i + 1}. 【${a.type || '其他'}】${a.title}（${a.duration || 0}min）— 负责人：${renderPerson(a.owner)}`
      ).join('\n');
      return (
        `## 会议议程总览\n` +
        `**会议：**${data.meetingTitle}\n` +
        `**日期：**${data.meetingDate || '待定'}\n` +
        (data.location ? `**地点：**${data.location}\n` : '') +
        `\n**议程列表：**\n${items || '> 暂无议程'}\n\n` +
        `> 合计 ${data.totalDuration || 0} 分钟，共 ${(data.agendaItems || []).length} 项议程`
      );
    }

    case 'rule-trigger': {
      return (
        `## ${icon('warning', {size: 14 })} 落后战区业绩承诺会触发通知\n` +
        `**规则：**${data.ruleName}\n` +
        `**考核月份：**${data.period}\n` +
        `**落后战区：**${data.theater}\n` +
        `**落后指标：**${data.indicatorName}\n` +
        `**排名：**倒数第 ${data.rank} 名\n` +
        `**达成率：**${data.achievementRate}%\n` +
        `**会议要求：**${data.actionRequired || '落后述职'}\n` +
        (data.meetingTitle ? `**会议：**${data.meetingTitle}\n` : '') +
        `> 请相关战区负责人准备落后述职材料并按时参会。`
      );
    }

    default:
      return '';
  }
}
