import { SanitizePipe } from "./sanitize.pipe";

describe("SanitizePipe", () => {
  const pipe = new SanitizePipe();

  it("removes HTML tags recursively", () => {
    const result = pipe.transform(
      {
        name: "<script>alert(1)</script> Cliente",
        nested: {
          notes: "<b>unsafe</b>",
        },
      },
      {} as never,
    ) as Record<string, unknown>;

    expect(result.name).toBe("Cliente");
    expect((result.nested as Record<string, unknown>).notes).toBe("unsafe");
  });
});
