import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseIdPipe implements PipeTransform<string, number> {
  transform(value: string) {
    const id = Number(value);
    if (
      !/^[1-9][0-9]*$/.test(value) ||
      !Number.isSafeInteger(id) ||
      id > 2147483647
    ) {
      throw new BadRequestException('ID must be a positive 32-bit integer');
    }
    return id;
  }
}
