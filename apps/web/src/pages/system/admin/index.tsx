import { PlusOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import React, { useMemo, useRef, useState } from 'react';
import {
  queryOperationLogs,
  querySystemPermissions,
  querySystemRoles,
  querySystemUsers,
  queryTaskLogs,
  saveSystemRole,
  saveSystemUser,
} from '@/services/erp/system';
import '@/pages/product/list/style.less';
import './style.less';

const statusColor: Record<string, string> = {
  SUCCESS: 'success',
  COMPLETED: 'success',
  FAILED: 'error',
  PROCESSING: 'processing',
  PENDING: 'warning',
};

const SystemAdminPage: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const roleActionRef = useRef<ActionType | null>(null);
  const userActionRef = useRef<ActionType | null>(null);
  const operationActionRef = useRef<ActionType | null>(null);
  const taskActionRef = useRef<ActionType | null>(null);
  const [roleForm] = Form.useForm<ERP.SystemRoleSavePayload>();
  const [userForm] = Form.useForm<ERP.SystemUserSavePayload>();
  const [roleOpen, setRoleOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: permissionsResponse } = useQuery({
    queryKey: ['system-permissions'],
    queryFn: querySystemPermissions,
  });
  const { data: rolesResponse } = useQuery({
    queryKey: ['system-role-options'],
    queryFn: () => querySystemRoles({ current: 1, pageSize: 100 }),
  });

  const permissionOptions = useMemo(
    () =>
      (permissionsResponse?.data || []).map((permission) => ({
        label: `${permission.module} · ${permission.action}`,
        value: permission.code,
      })),
    [permissionsResponse?.data],
  );
  const roleOptions = useMemo(
    () =>
      (rolesResponse?.data || []).map((role) => ({
        label: `${role.code} · ${role.name}`,
        value: role.id,
      })),
    [rolesResponse?.data],
  );

  const submitRole = async () => {
    const values = await roleForm.validateFields();
    setSaving(true);
    try {
      await saveSystemRole({ ...values, active: values.active ?? true });
      messageApi.success('角色已保存');
      setRoleOpen(false);
      roleForm.resetFields();
      roleActionRef.current?.reload();
    } catch {
      messageApi.error('保存角色失败');
    } finally {
      setSaving(false);
    }
  };

  const submitUser = async () => {
    const values = await userForm.validateFields();
    setSaving(true);
    try {
      await saveSystemUser({ ...values, active: values.active ?? true });
      messageApi.success('用户已保存');
      setUserOpen(false);
      userForm.resetFields();
      userActionRef.current?.reload();
    } catch {
      messageApi.error('保存用户失败');
    } finally {
      setSaving(false);
    }
  };

  const roleColumns: ProColumns<ERP.SystemRoleItem>[] = [
    { title: '角色编码', dataIndex: 'code', width: 160 },
    { title: '角色名称', dataIndex: 'name', width: 180 },
    {
      title: '权限',
      dataIndex: 'permissions',
      width: 360,
      render: (_, record) => (
        <Space size={4} wrap>
          {record.permissions.map((permission) => (
            <Tag key={permission}>{permission}</Tag>
          ))}
        </Space>
      ),
    },
    { title: '用户数', dataIndex: 'userCount', width: 100, align: 'right' },
    {
      title: '状态',
      dataIndex: 'active',
      width: 100,
      render: (_, record) => (
        <Tag color={record.active ? 'success' : 'default'}>
          {record.active ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 90,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={() => {
            roleForm.setFieldsValue({
              code: record.code,
              name: record.name,
              description: record.description || undefined,
              permissions: record.permissions,
              active: record.active,
            });
            setRoleOpen(true);
          }}
        >
          编辑
        </Button>
      ),
    },
  ];

  const userColumns: ProColumns<ERP.SystemUserItem>[] = [
    { title: '用户名', dataIndex: 'username', width: 180 },
    { title: '显示名', dataIndex: 'displayName', width: 180 },
    { title: '邮箱', dataIndex: 'email', width: 220 },
    {
      title: '角色',
      dataIndex: 'roles',
      render: (_, record) => (
        <Space size={4} wrap>
          {record.roles.map((role) => (
            <Tag key={role.id}>{role.name}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'active',
      width: 100,
      render: (_, record) => (
        <Tag color={record.active ? 'success' : 'default'}>
          {record.active ? '启用' : '停用'}
        </Tag>
      ),
    },
  ];

  const operationColumns: ProColumns<ERP.OperationLogItem>[] = [
    { title: '模块', dataIndex: 'module', width: 120 },
    { title: '动作', dataIndex: 'action', width: 220 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (_, record) => (
        <Tag color={statusColor[record.status] || 'default'}>{record.status}</Tag>
      ),
    },
    { title: '资源', dataIndex: 'resourceId', width: 180 },
    {
      title: '消息',
      dataIndex: 'message',
      ellipsis: true,
      renderText: (value) => value || '-',
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      width: 180,
      renderText: (value) =>
        value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-',
    },
  ];

  const taskColumns: ProColumns<ERP.TaskLogItem>[] = [
    { title: '任务 ID', dataIndex: 'id', width: 240, ellipsis: true },
    { title: '队列', dataIndex: 'queueName', width: 170 },
    { title: '任务名', dataIndex: 'jobName', width: 220 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (_, record) => (
        <Tag color={statusColor[record.status] || 'default'}>{record.status}</Tag>
      ),
    },
    {
      title: '错误',
      dataIndex: 'errorMessage',
      ellipsis: true,
      renderText: (value) => value || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 180,
      renderText: (value) =>
        value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-',
    },
  ];

  return (
    <div className="erp-product-page erp-system-page">
      {contextHolder}
      <div className="erp-content">
        <Tabs
          items={[
            {
              key: 'roles',
              label: '角色权限',
              children: (
                <ProTable<ERP.SystemRoleItem, ERP.SystemPageParams>
                  rowKey="id"
                  actionRef={roleActionRef}
                  className="erp-dense-table"
                  columns={roleColumns}
                  search={false}
                  toolBarRender={() => [
                    <Button
                      key="create-role"
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        roleForm.resetFields();
                        setRoleOpen(true);
                      }}
                    >
                      新建角色
                    </Button>,
                  ]}
                  request={(params) => querySystemRoles(params)}
                  pagination={{ pageSize: 20, showSizeChanger: true }}
                />
              ),
            },
            {
              key: 'users',
              label: '用户角色',
              children: (
                <ProTable<ERP.SystemUserItem, ERP.SystemPageParams>
                  rowKey="id"
                  actionRef={userActionRef}
                  className="erp-dense-table"
                  columns={userColumns}
                  search={false}
                  toolBarRender={() => [
                    <Button
                      key="create-user"
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        userForm.resetFields();
                        setUserOpen(true);
                      }}
                    >
                      新建用户
                    </Button>,
                  ]}
                  request={(params) => querySystemUsers(params)}
                  pagination={{ pageSize: 20, showSizeChanger: true }}
                />
              ),
            },
            {
              key: 'operations',
              label: '操作日志',
              children: (
                <ProTable<ERP.OperationLogItem, ERP.OperationLogQueryParams>
                  rowKey="id"
                  actionRef={operationActionRef}
                  className="erp-dense-table"
                  columns={operationColumns}
                  search={false}
                  toolBarRender={() => [
                    <Button
                      key="refresh"
                      icon={<ReloadOutlined />}
                      onClick={() => operationActionRef.current?.reload()}
                    >
                      刷新
                    </Button>,
                  ]}
                  request={(params) => queryOperationLogs(params)}
                  pagination={{ pageSize: 20, showSizeChanger: true }}
                />
              ),
            },
            {
              key: 'tasks',
              label: '任务日志',
              children: (
                <ProTable<ERP.TaskLogItem, ERP.TaskLogQueryParams>
                  rowKey="id"
                  actionRef={taskActionRef}
                  className="erp-dense-table"
                  columns={taskColumns}
                  search={false}
                  toolBarRender={() => [
                    <Button
                      key="refresh"
                      icon={<ReloadOutlined />}
                      onClick={() => taskActionRef.current?.reload()}
                    >
                      刷新
                    </Button>,
                  ]}
                  request={(params) => queryTaskLogs(params)}
                  pagination={{ pageSize: 20, showSizeChanger: true }}
                />
              ),
            },
          ]}
        />
      </div>

      <Modal
        title="角色"
        open={roleOpen}
        confirmLoading={saving}
        onOk={submitRole}
        onCancel={() => setRoleOpen(false)}
        okText="保存"
        destroyOnClose
      >
        <Form form={roleForm} layout="vertical" initialValues={{ active: true, permissions: [] }}>
          <Form.Item name="code" label="角色编码" rules={[{ required: true }]}>
            <Input placeholder="admin / operator" />
          </Form.Item>
          <Form.Item name="name" label="角色名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="permissions" label="权限" rules={[{ required: true }]}>
            <Select mode="multiple" options={permissionOptions} />
          </Form.Item>
          <Form.Item name="active" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="用户"
        open={userOpen}
        confirmLoading={saving}
        onOk={submitUser}
        onCancel={() => setUserOpen(false)}
        okText="保存"
        destroyOnClose
      >
        <Form form={userForm} layout="vertical" initialValues={{ active: true }}>
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="displayName" label="显示名">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input />
          </Form.Item>
          <Form.Item name="roleIds" label="角色">
            <Select mode="multiple" options={roleOptions} />
          </Form.Item>
          <Form.Item name="active" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Typography.Text type="secondary">
            <SaveOutlined /> 当前版本先维护 ERP 本地角色关系；接入真实登录后可把这里绑定到认证用户。
          </Typography.Text>
        </Form>
      </Modal>
    </div>
  );
};

export default SystemAdminPage;
