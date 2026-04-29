import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import {
  ErpAuditLogQueryDto,
  ErpSystemPageQueryDto,
  ErpTaskLogQueryDto,
  SaveErpRoleDto,
  SaveErpUserDto,
} from './dto/erp-system.dto';
import { ErpSystemService } from './erp-system.service';

@Controller('erp/system')
export class ErpSystemController {
  constructor(private readonly erpSystemService: ErpSystemService) {}

  @Get('permissions')
  listPermissions() {
    return this.erpSystemService.listPermissions();
  }

  @Get('roles')
  listRoles(@Query() query: ErpSystemPageQueryDto) {
    return this.erpSystemService.listRoles(query);
  }

  @Post('roles')
  saveRole(@Body() payload: SaveErpRoleDto) {
    return this.erpSystemService.saveRole(payload);
  }

  @Get('users')
  listUsers(@Query() query: ErpSystemPageQueryDto) {
    return this.erpSystemService.listUsers(query);
  }

  @Post('users')
  saveUser(@Body() payload: SaveErpUserDto) {
    return this.erpSystemService.saveUser(payload);
  }

  @Get('operation-logs')
  listOperationLogs(@Query() query: ErpAuditLogQueryDto) {
    return this.erpSystemService.listOperationLogs(query);
  }

  @Get('task-logs')
  listTaskLogs(@Query() query: ErpTaskLogQueryDto) {
    return this.erpSystemService.listTaskLogs(query);
  }
}
