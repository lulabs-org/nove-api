import * as JSZip from 'jszip';
import { validateSkillZip, MAX_SKILL_ZIP_BYTES } from './skill-zip.validator';

async function createZip(files: Record<string, string>) {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) {
    zip.file(name, content, { createFolders: false });
  }
  return zip.generateAsync({ type: 'nodebuffer' });
}

const manifest =
  '---\nname: demo-skill\ndescription: A useful skill\n---\n# Demo\n';

describe('validateSkillZip', () => {
  it('reads a valid manifest from a complete Zip', async () => {
    const zip = await createZip({
      'demo/SKILL.md': manifest,
      'demo/scripts/run.sh': 'echo hello',
    });
    await expect(validateSkillZip(zip)).resolves.toEqual({
      code: 'demo-skill',
      name: 'demo-skill',
      description: 'A useful skill',
    });
  });

  it('accepts ordinary folder entries around SKILL.md', async () => {
    const zip = new JSZip();
    zip.file('demo/SKILL.md', manifest);
    zip.file('demo/scripts/run.sh', 'echo hello');
    await expect(
      validateSkillZip(await zip.generateAsync({ type: 'nodebuffer' })),
    ).resolves.toMatchObject({ code: 'demo-skill' });
  });

  it('rejects missing or invalid manifests', async () => {
    await expect(
      validateSkillZip(await createZip({ 'README.md': '# No manifest' })),
    ).rejects.toThrow();
    await expect(
      validateSkillZip(
        await createZip({ 'SKILL.md': 'name: missing-frontmatter' }),
      ),
    ).rejects.toThrow();
    await expect(
      validateSkillZip(
        await createZip({
          'SKILL.md': '---\nname: Invalid Name\ndescription: test\n---',
        }),
      ),
    ).rejects.toThrow();
  });

  it('rejects traversal and absolute paths', async () => {
    const ordinary = await createZip({
      'safe.txt': 'bad',
      'SKILL.md': manifest,
    });
    const traversal = Buffer.from(ordinary);
    for (
      let offset = 0;
      (offset = traversal.indexOf('safe.txt', offset)) >= 0;
      offset += 8
    ) {
      traversal.write('../a.txt', offset, 'ascii');
    }
    await expect(validateSkillZip(traversal)).rejects.toThrow();

    const absolute = Buffer.from(ordinary);
    for (
      let offset = 0;
      (offset = absolute.indexOf('safe.txt', offset)) >= 0;
      offset += 8
    ) {
      absolute.write('/abs.txt', offset, 'ascii');
    }
    await expect(validateSkillZip(absolute)).rejects.toThrow();
  });

  it('rejects too many files and oversized archives', async () => {
    const files: Record<string, string> = { 'SKILL.md': manifest };
    for (let i = 0; i < 201; i++) files[`file-${i}.txt`] = 'x';
    await expect(validateSkillZip(await createZip(files))).rejects.toThrow();
    await expect(
      validateSkillZip(Buffer.alloc(MAX_SKILL_ZIP_BYTES + 1)),
    ).rejects.toThrow();

    const expanded = await createZip({
      'SKILL.md': manifest,
      'extra.txt': 'x',
    });
    const centralDirectory = expanded.indexOf(Buffer.from('PK\x01\x02'));
    expanded.writeUInt32LE(50 * 1024 * 1024 + 1, centralDirectory + 24);
    await expect(validateSkillZip(expanded)).rejects.toThrow();
  });

  it('rejects symbolic links', async () => {
    const zip = new JSZip();
    zip.file('SKILL.md', manifest);
    zip.file('link', '../outside', { unixPermissions: 0o120777 });
    const buffer = await zip.generateAsync({
      type: 'nodebuffer',
      platform: 'UNIX',
    });
    await expect(validateSkillZip(buffer)).rejects.toThrow();
  });
});
