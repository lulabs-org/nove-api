import {
  buildContactChangeNotificationEmail,
  buildPasswordResetNotificationEmail,
  buildVerificationEmail,
  buildWelcomeEmail,
  escapeHtml,
  formatEmailTime,
  EmailBrand,
} from './index';

const platformBrand: EmailBrand = {
  name: 'Nove System',
  logoUrl: null,
  primaryColor: '#2563eb',
  footerText: 'Nove System 自动邮件',
};

describe('mail templates', () => {
  it.each([
    ['register', '注册'],
    ['login', '登录'],
    ['reset_password', '重置密码'],
    ['security', '安全操作'],
  ] as const)('builds branded verification content for %s', (type, label) => {
    const content = buildVerificationEmail(type, '123456', platformBrand);

    expect(content.subject).toBe(`Nove System ${label}验证码`);
    expect(content.html).toContain('Nove System');
    expect(content.html).toContain('123456');
    expect(content.text).toContain('123456');
    expect(content.html).not.toContain('LuLab');
  });

  it('escapes user-controlled values in HTML while preserving plain text', () => {
    const username = 'Alice <script>alert("x")</script> & Bob';
    const content = buildWelcomeEmail(username, platformBrand);

    expect(content.subject).toBe('欢迎加入 Nove System！');
    expect(content.html).toContain(
      'Alice &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; Bob',
    );
    expect(content.html).not.toContain('<script>');
    expect(content.text).toContain(username);
    expect(content.html).not.toContain('href="#"');
  });

  it('formats security timestamps explicitly in Asia/Shanghai', () => {
    const date = new Date('2026-08-31T00:00:00.000Z');
    const content = buildPasswordResetNotificationEmail(
      'Alice',
      platformBrand,
      date,
    );

    expect(content.subject).toBe('Nove System 密码重置通知');
    expect(content.html).toContain('08:00:00');
    expect(content.text).toContain('08:00:00');
    expect(content.html).not.toContain('两步验证');
  });

  it('keeps contact-change notifications masked and escapes their HTML', () => {
    const content = buildContactChangeNotificationEmail(
      {
        contactLabel: '邮箱',
        newContactMasked: 'ne***<unsafe>@example.com',
        changedAt: new Date('2026-08-31T00:00:00.000Z'),
        recipient: 'OLD',
      },
      platformBrand,
    );

    expect(content.html).toContain('ne***&lt;unsafe&gt;@example.com');
    expect(content.html).not.toContain('ne***<unsafe>@example.com');
    expect(content.text).toContain('ne***<unsafe>@example.com');
    expect(content.html).toContain('原联系方式');
  });

  it('renders a custom organization brand without hard-coded platform copy', () => {
    const content = buildWelcomeEmail('Alice', {
      name: '示例组织',
      logoUrl: 'https://cdn.example.com/org.png',
      primaryColor: '#123456',
      footerText: '示例组织自动邮件',
    });

    expect(content.subject).toBe('欢迎加入 示例组织！');
    expect(content.html).toContain('https://cdn.example.com/org.png');
    expect(content.html).toContain('alt="示例组织"');
    expect(content.html).toContain('示例组织自动邮件');
    expect(content.html).not.toContain('Nove System');
  });

  it('rejects unsafe brand presentation values', () => {
    const content = buildWelcomeEmail('Alice', {
      name: 'Safe\r\nBcc: victim@example.com',
      logoUrl: 'javascript:alert(1)',
      primaryColor: 'red; background:url(x)',
      footerText: '<script>alert(1)</script>',
    });

    expect(content.subject).toBe('欢迎加入 Safe Bcc: victim@example.com！');
    expect(content.html).not.toContain('javascript:');
    expect(content.html).not.toContain('<script>');
    expect(content.html).toContain('#2563eb');
  });

  it('provides reusable escaping and deterministic time helpers', () => {
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#039;');
    expect(formatEmailTime(new Date('2026-08-31T00:00:00.000Z'))).toContain(
      '08:00:00',
    );
  });
});
