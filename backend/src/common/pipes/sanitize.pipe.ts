import { ArgumentMetadata, Injectable, PipeTransform } from "@nestjs/common";
import sanitizeHtml from "sanitize-html";

@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: unknown, _metadata: ArgumentMetadata) {
    return this.sanitizeValue(value);
  }

  private sanitizeValue(value: unknown): unknown {
    if (typeof value === "string") {
      return sanitizeHtml(value.trim(), {
        allowedTags: [],
        allowedAttributes: {},
      }).trim();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeValue(item));
    }

    if (value && typeof value === "object") {
      return Object.entries(value as Record<string, unknown>).reduce(
        (accumulator, [key, nestedValue]) => {
          accumulator[key] = this.sanitizeValue(nestedValue);
          return accumulator;
        },
        {} as Record<string, unknown>,
      );
    }

    return value;
  }
}
