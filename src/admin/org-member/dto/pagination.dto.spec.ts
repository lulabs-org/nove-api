import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MemberRoleOptionQueryDto, PaginationDto } from './pagination.dto';

describe('organization member pagination DTOs', () => {
  it('treats blank member filters as omitted query parameters', async () => {
    const input = plainToInstance(PaginationDto, {
      page: '1',
      pageSize: '100',
      keyword: '',
      deptId: '   ',
      type: '',
      status: '',
      includeChildren: '',
    });

    await expect(validate(input)).resolves.toEqual([]);
    expect(input).toEqual(
      expect.objectContaining({
        page: 1,
        pageSize: 100,
        keyword: undefined,
        deptId: undefined,
        type: undefined,
        status: undefined,
        includeChildren: undefined,
      }),
    );
  });

  it.each([
    ['true', true],
    ['false', false],
  ])('parses includeChildren=%s as %s', async (value, expected) => {
    const input = plainToInstance(PaginationDto, { includeChildren: value });

    await expect(validate(input)).resolves.toEqual([]);
    expect(input.includeChildren).toBe(expected);
  });

  it('treats blank member role option filters as omitted', async () => {
    const input = plainToInstance(MemberRoleOptionQueryDto, {
      keyword: '',
      roleId: ' ',
      assignment: '',
    });

    await expect(validate(input)).resolves.toEqual([]);
    expect(input).toEqual(
      expect.objectContaining({
        keyword: undefined,
        roleId: undefined,
        assignment: undefined,
      }),
    );
  });

  it.each([PaginationDto, MemberRoleOptionQueryDto])(
    'rejects page sizes above 100 for %p',
    async (Dto) => {
      const input = plainToInstance(Dto, { pageSize: 101 });
      const errors = await validate(input);

      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ property: 'pageSize' }),
        ]),
      );
    },
  );
});
