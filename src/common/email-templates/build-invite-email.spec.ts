import { buildInviteEmail } from './build-invite-email';

const baseData = {
  name: '张三',
  orgName: 'LuLab',
  email: 'zhangsan@example.com',
  invitationToken: 'tok-abc123',
  memberId: 'member-1',
  frontendUrl: 'https://example.com',
  invitationExpiresInDays: 7,
};

describe('build-invite-email', () => {
  describe('buildInviteEmail', () => {
    it('builds subject containing the org name', () => {
      const { subject } = buildInviteEmail(baseData);
      expect(subject).toBe('您已被邀请加入 LuLab');
    });

    it('builds html containing name, email, and the invite accept link', () => {
      const { html } = buildInviteEmail(baseData);
      expect(html).toContain('张三');
      expect(html).toContain('zhangsan@example.com');
      expect(html).toContain('/invite/accept');
      expect(html).toContain('memberId=member-1');
      expect(html).toContain('token=tok-abc123');
      // No plaintext password is rendered anywhere
      expect(html).not.toContain('初始密码');
      expect(html).toContain('<div');
      expect(html).toContain('</div>');
    });

    it('escapes HTML special characters in user-provided fields', () => {
      const { html } = buildInviteEmail({
        ...baseData,
        name: '<script>x</script>',
        invitationToken: 'a&b<c>',
      });
      expect(html).not.toContain('<script>x</script>');
      expect(html).toContain('&lt;script&gt;');
      // Token is URL-encoded (not raw) before being placed in the invite link
      expect(html).toContain('token=a%26b%3Cc%3E');
    });

    it('uses fallbacks for empty name and org', () => {
      const { subject, html } = buildInviteEmail({
        ...baseData,
        name: '',
        orgName: '',
      });
      expect(subject).toBe('您已被邀请加入 ');
      expect(html).toContain('用户，您好');
    });

    it('renders the configured expiry days (not hardcoded)', () => {
      const { html } = buildInviteEmail({
        ...baseData,
        invitationExpiresInDays: 14,
      });
      expect(html).toContain('14 天内有效');
      expect(html).not.toContain('7 天内有效');
    });
  });
});
