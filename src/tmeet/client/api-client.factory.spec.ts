import { SystemConfigService } from '@/admin/system-config/services';
import { TMeetApiClientFactory } from './api-client.factory';

describe('TMeetApiClientFactory', () => {
  afterEach(() => jest.restoreAllMocks());

  it('isolates concurrent credentials and refreshes configuration for new clients', async () => {
    let revision = 1;
    const getEffectiveConfig = jest.fn((orgId: string) =>
      Promise.resolve({
        value: { secretId: `${orgId}-${revision}`, secretKey: 'test-secret' },
      }),
    );
    const factory = new TMeetApiClientFactory({
      getEffectiveConfig,
    } as unknown as SystemConfigService);
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() =>
        Promise.resolve(new Response('{}', { status: 200 })),
      );
    const [first, second] = await Promise.all([
      factory.forOrg('org-a'),
      factory.forOrg('org-b'),
    ]);
    revision = 2;
    const refreshed = await factory.forOrg('org-a');

    await Promise.all([
      first.getMeetingDetail('meeting-a', 'operator'),
      second.getMeetingDetail('meeting-b', 'operator'),
      refreshed.getMeetingDetail('meeting-c', 'operator'),
    ]);

    const credentials = fetchMock.mock.calls.map(([, options]) => ({
      key: new Headers(options?.headers).get('X-TC-Key'),
    }));
    expect(credentials).toEqual([
      { key: 'org-a-1' },
      { key: 'org-b-1' },
      { key: 'org-a-2' },
    ]);
    expect(getEffectiveConfig).toHaveBeenCalledWith('org-a', 'tencent-meeting');
    expect(getEffectiveConfig).toHaveBeenCalledWith('org-b', 'tencent-meeting');
  });

  it('rejects missing organization before reading configuration', async () => {
    const getEffectiveConfig = jest.fn();
    const factory = new TMeetApiClientFactory({
      getEffectiveConfig,
    } as unknown as SystemConfigService);
    await expect(factory.forOrg(' ')).rejects.toThrow(
      'Organization is required',
    );
    expect(getEffectiveConfig).not.toHaveBeenCalled();
  });
});
