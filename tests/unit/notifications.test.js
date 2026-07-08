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

      expect(msg).toContain('决议推送');
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

      expect(msg).toContain('待办提醒');
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

      expect(msg).toContain('会议预警');
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

      expect(msg).toContain('行动项预警');
      expect(msg).toContain('更新销售数据');
      expect(msg).toContain('距截止仅剩 2 天');
    });
  });

  describe('agenda', () => {
    it('renders single agenda notification', () => {
      const msg = renderNotificationMessage('agenda', {
        meetingTitle: 'Q1 战略会',
        agendaTitle: 'KPI 达成追踪',
        agendaType: '目标管理',
        duration: 30,
        owner: '运营部',
        speaker: '张三',
        materialLink: 'https://docs.example.com/agenda1',
      });

      expect(msg).toContain('议程通知');
      expect(msg).toContain('Q1 战略会');
      expect(msg).toContain('KPI 达成追踪');
      expect(msg).toContain('目标管理');
      expect(msg).toContain('30 分钟');
      expect(msg).toContain('运营部');
      expect(msg).toContain('张三');
      expect(msg).toContain('[查看材料](https://docs.example.com/agenda1)');
      expect(msg).toContain('请准时参加议程讨论');
    });

    it('renders agenda material reminder mode', () => {
      const msg = renderNotificationMessage('agenda', {
        meetingTitle: '月度经营会',
        agendaTitle: '预算复盘',
        agendaType: '预算与财经',
        duration: 45,
        owner: 'CFO',
        mode: 'material',
      });

      expect(msg).toContain('请提前准备议程材料');
      expect(msg).not.toContain('演讲人');
      expect(msg).not.toContain('材料：');
    });

    it('renders agenda change mode', () => {
      const msg = renderNotificationMessage('agenda', {
        meetingTitle: '专项会',
        agendaTitle: '组织架构调整',
        duration: 20,
        mode: 'change',
      });

      expect(msg).toContain('议程信息已更新，请留意');
      expect(msg).toContain('待定');
    });
  });

  describe('agenda-meeting', () => {
    it('renders full meeting agenda overview', () => {
      const msg = renderNotificationMessage('agenda-meeting', {
        meetingTitle: 'Q2 复盘会',
        meetingDate: '2026-06-15',
        location: '3F 大会议室',
        agendaItems: [
          { title: '目标管理复盘', type: '目标管理', duration: 30, owner: '张三' },
          { title: 'Q1 财务整体复盘', type: '预算与财经', duration: 45, owner: { id: 'e001', name: '李四', displayName: '李四' } },
        ],
        totalDuration: 75,
      });

      expect(msg).toContain('会议议程总览');
      expect(msg).toContain('Q2 复盘会');
      expect(msg).toContain('2026-06-15');
      expect(msg).toContain('3F 大会议室');
      expect(msg).toContain('1. 【目标管理】目标管理复盘（30min）— 负责人：张三');
      expect(msg).toContain('2. 【预算与财经】Q1 财务整体复盘（45min）— 负责人：李四');
      expect(msg).toContain('合计 75 分钟');
      expect(msg).toContain('共 2 项议程');
    });

    it('renders empty agenda overview', () => {
      const msg = renderNotificationMessage('agenda-meeting', {
        meetingTitle: '临时会议',
        meetingDate: '2026-06-20',
        agendaItems: [],
        totalDuration: 0,
      });

      expect(msg).toContain('暂无议程');
      expect(msg).toContain('共 0 项议程');
    });
  });

  describe('unknown type', () => {
    it('returns empty string for unknown type', () => {
      const msg = renderNotificationMessage('unknown', { foo: 'bar' });
      expect(msg).toBe('');
    });
  });
});
