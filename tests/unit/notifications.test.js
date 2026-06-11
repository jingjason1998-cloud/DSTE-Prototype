import { describe, it, expect } from 'vitest';
import { renderNotificationMessage } from '../../src/meetings/utils/notifications.js';

describe('renderNotificationMessage', () => {
  describe('resolution', () => {
    it('renders approved resolution message', () => {
      const msg = renderNotificationMessage('resolution', {
        meetingTitle: 'Q1 战略会',
        content: 'Q2 营收目标 3.2 亿',
        owner: '李经理',
        deadline: '2026-04-30',
        status: 'approved',
        kmsUrl: 'https://kms.example.com/doc/1',
      });

      expect(msg).toContain('📋 决议推送');
      expect(msg).toContain('Q1 战略会');
      expect(msg).toContain('Q2 营收目标 3.2 亿');
      expect(msg).toContain('李经理');
      expect(msg).toContain('2026-04-30');
      expect(msg).toContain('<font color="info">已批准</font>');
      expect(msg).toContain('[查看文档](https://kms.example.com/doc/1)');
    });

    it('renders pending resolution without KMS', () => {
      const msg = renderNotificationMessage('resolution', {
        meetingTitle: '月度经营会',
        content: '待定事项',
        owner: '待定',
        deadline: '未定',
        status: 'pending',
      });

      expect(msg).toContain('<font color="warning">待审批</font>');
      expect(msg).not.toContain('KMS');
    });

    it('renders implemented resolution', () => {
      const msg = renderNotificationMessage('resolution', {
        meetingTitle: '专项会议',
        content: '已完成',
        status: 'implemented',
      });

      expect(msg).toContain('<font color="info">已执行</font>');
    });
  });

  describe('todo', () => {
    it('renders todo reminder with days left', () => {
      const msg = renderNotificationMessage('todo', {
        meetingTitle: 'Q1 战略会',
        content: '完成市场调研',
        owner: '王总监',
        deadline: '2026-05-15',
        daysLeft: 5,
      });

      expect(msg).toContain('⏰ 待办提醒');
      expect(msg).toContain('完成市场调研');
      expect(msg).toContain('王总监');
      expect(msg).toContain('距截止还有 5 天');
      expect(msg).toContain('<font color="info">');
    });

    it('renders overdue todo in warning color', () => {
      const msg = renderNotificationMessage('todo', {
        meetingTitle: '月度会',
        content: '提交报告',
        daysLeft: -2,
      });

      expect(msg).toContain('已逾期 2 天');
      expect(msg).toContain('<font color="warning">');
    });

    it('renders urgent todo (<=3 days) in warning color', () => {
      const msg = renderNotificationMessage('todo', {
        meetingTitle: '月度会',
        content: '提交报告',
        daysLeft: 3,
      });

      expect(msg).toContain('距截止还有 3 天');
      expect(msg).toContain('<font color="warning">');
    });

    it('renders todo without daysLeft as comment', () => {
      const msg = renderNotificationMessage('todo', {
        meetingTitle: '月度会',
        content: '长期任务',
      });

      expect(msg).toContain('若干天');
      expect(msg).toContain('<font color="comment">');
    });
  });

  describe('alert-meeting', () => {
    it('renders meeting pipeline alert', () => {
      const msg = renderNotificationMessage('alert-meeting', {
        meetingTitle: '战区月度会',
        stepLabel: '纪要起草',
        daysOverdue: 3,
        meetingDate: '2026-05-20',
      });

      expect(msg).toContain('⚠️ 会议预警');
      expect(msg).toContain('纪要起草 尚未完成');
      expect(msg).toContain('3 天');
      expect(msg).toContain('2026-05-20');
    });
  });

  describe('alert-action', () => {
    it('renders action item alert', () => {
      const msg = renderNotificationMessage('alert-action', {
        meetingTitle: 'Q2 复盘',
        content: '更新销售数据',
        owner: '张经理',
        deadline: '2026-06-10',
        daysLeft: 2,
      });

      expect(msg).toContain('⚠️ 行动项预警');
      expect(msg).toContain('更新销售数据');
      expect(msg).toContain('距截止仅剩 2 天');
    });
  });

  describe('unknown type', () => {
    it('returns empty string for unknown type', () => {
      const msg = renderNotificationMessage('unknown', { foo: 'bar' });
      expect(msg).toBe('');
    });
  });
});
