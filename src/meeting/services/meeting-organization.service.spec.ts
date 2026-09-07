import { SingleOrgContextService } from '@/admin/system-config/services';
import { MeetingOrganizationService } from './meeting-organization.service';

describe('MeetingOrganizationService', () => {
  it('uses the initialized single-organization runtime context', () => {
    const getOrgId = jest.fn().mockReturnValue('org-1');
    const orgContext = {
      getOrgId,
    } as unknown as SingleOrgContextService;
    const service = new MeetingOrganizationService(orgContext);

    expect(service.resolveDefaultOrgId()).toBe('org-1');
    expect(getOrgId).toHaveBeenCalledTimes(1);
  });
});
