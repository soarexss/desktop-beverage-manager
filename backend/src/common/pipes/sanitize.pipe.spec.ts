import { SanitizePipe } from './sanitize.pipe';

describe('SanitizePipe', () => {
  const pipe = new SanitizePipe();

  it('preserves passwords and XML', () => {
    expect(
      pipe.transform({
        password: ' <secret> ',
        xmlContent: '<NFe>value</NFe>',
      }),
    ).toEqual({ password: ' <secret> ', xmlContent: '<NFe>value</NFe>' });
  });

  it('removes HTML tags recursively', () => {
    const result = pipe.transform({
      name: '<script>alert(1)</script> Cliente',
      nested: {
        notes: '<b>unsafe</b>',
      },
    }) as Record<string, unknown>;

    expect(result.name).toBe('Cliente');
    expect((result.nested as Record<string, unknown>).notes).toBe('unsafe');
  });
});
