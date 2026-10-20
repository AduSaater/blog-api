import { PartialType } from '@nestjs/swagger';
import { CreateTagDto } from './create-tags.dto';

export class UpdateTagDto extends PartialType(CreateTagDto) {}
