import { CalculatorOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Card,
  DatePicker,
  Input,
  InputNumber,
  message,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import React, { useMemo, useRef, useState } from 'react';
import {
  queryFinanceSummary,
  queryOrderProfits,
  rebuildOrderProfits,
} from '@/services/erp/finance';
import { queryShops } from '@/services/erp/shop';
import '@/pages/product/list/style.less';
import './style.less';

const money = (currency: string, value?: string) =>
  value ? `${currency} ${Number(value).toFixed(2)}` : '-';

const FinanceReportPage: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const actionRef = useRef<ActionType | null>(null);
  const [shopId, setShopId] = useState<string>();
  const [keyword, setKeyword] = useState<string>();
  const [dateRange, setDateRange] = useState<[string, string]>();
  const [rebuildLimit, setRebuildLimit] = useState(200);
  const [rebuilding, setRebuilding] = useState(false);

  const { data: shopsResponse } = useQuery({
    queryKey: ['finance-shops'],
    queryFn: () => queryShops({ current: 1, pageSize: 100 }),
  });

  const summaryQuery = useQuery({
    queryKey: ['finance-summary', shopId, dateRange],
    queryFn: () =>
      queryFinanceSummary({
        shopId,
        startDate: dateRange?.[0],
        endDate: dateRange?.[1],
      }),
  });

  const shopOptions = useMemo(
    () =>
      (shopsResponse?.data || []).map((shop) => ({
        label: shop.shopName,
        value: shop.shopId,
      })),
    [shopsResponse?.data],
  );

  const rebuild = async () => {
    setRebuilding(true);
    try {
      const response = await rebuildOrderProfits({ shopId, limit: rebuildLimit });
      messageApi.success(`已重算 ${response.data.successCount} 个订单`);
      await summaryQuery.refetch();
      actionRef.current?.reload();
    } catch {
      messageApi.error('利润快照重算失败');
    } finally {
      setRebuilding(false);
    }
  };

  const columns: ProColumns<ERP.OrderProfitItem>[] = [
    {
      title: '订单号',
      dataIndex: 'orderSn',
      width: 210,
      renderText: (value) => value || '-',
    },
    {
      title: '店铺',
      dataIndex: 'shopId',
      width: 140,
    },
    {
      title: '销售额',
      dataIndex: 'revenue',
      width: 130,
      align: 'right',
      render: (_, record) => money(record.currency, record.revenue),
    },
    {
      title: '商品成本',
      dataIndex: 'productCost',
      width: 130,
      align: 'right',
      render: (_, record) => money(record.currency, record.productCost),
    },
    {
      title: '平台费用',
      dataIndex: 'platformFee',
      width: 130,
      align: 'right',
      render: (_, record) => money(record.currency, record.platformFee),
    },
    {
      title: '物流费用',
      dataIndex: 'logisticsFee',
      width: 130,
      align: 'right',
      render: (_, record) => money(record.currency, record.logisticsFee),
    },
    {
      title: '毛利',
      dataIndex: 'grossProfit',
      width: 130,
      align: 'right',
      render: (_, record) => (
        <Typography.Text type={Number(record.grossProfit) < 0 ? 'danger' : undefined}>
          {money(record.currency, record.grossProfit)}
        </Typography.Text>
      ),
    },
    {
      title: '毛利率',
      dataIndex: 'grossMarginRate',
      width: 110,
      align: 'right',
      renderText: (value) =>
        value ? `${(Number(value) * 100).toFixed(2)}%` : '-',
    },
    {
      title: '质量',
      dataIndex: 'estimated',
      width: 150,
      render: (_, record) => (
        <Space size={4} wrap>
          {record.estimated ? <Tag color="warning">估算</Tag> : <Tag color="success">完整</Tag>}
          {record.missingCost ? <Tag color="error">缺成本</Tag> : null}
        </Space>
      ),
    },
    {
      title: '计算时间',
      dataIndex: 'calculatedAt',
      width: 180,
      renderText: (value) =>
        value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-',
    },
  ];

  const summary = summaryQuery.data?.data;

  return (
    <div className="erp-product-page erp-finance-page">
      {contextHolder}
      <div className="erp-content">
        <div className="erp-finance-summary">
          <Card>
            <Statistic title="订单数" value={summary?.orderCount || 0} />
          </Card>
          <Card>
            <Statistic title="销售额" value={summary?.revenue || '0.00'} prefix="BRL" />
          </Card>
          <Card>
            <Statistic title="商品成本" value={summary?.productCost || '0.00'} prefix="BRL" />
          </Card>
          <Card>
            <Statistic title="毛利" value={summary?.grossProfit || '0.00'} prefix="BRL" />
          </Card>
          <Card>
            <Statistic
              title="毛利率"
              value={
                summary?.grossMarginRate
                  ? `${(Number(summary.grossMarginRate) * 100).toFixed(2)}%`
                  : '-'
              }
            />
          </Card>
          <Card>
            <Statistic title="缺成本订单" value={summary?.missingCostCount || 0} />
          </Card>
        </div>

        <div className="erp-filterbar">
          <Select
            allowClear
            placeholder="全部店铺"
            value={shopId}
            options={shopOptions}
            style={{ width: 220 }}
            onChange={(value) => {
              setShopId(value);
              summaryQuery.refetch();
              actionRef.current?.reload();
            }}
          />
          <DatePicker.RangePicker
            onChange={(_, values) => {
              setDateRange(
                values[0] && values[1] ? [values[0], values[1]] : undefined,
              );
              actionRef.current?.reload();
            }}
          />
          <Input.Search
            allowClear
            placeholder="搜索订单号 / 店铺"
            style={{ width: 280 }}
            onSearch={(value) => {
              setKeyword(value || undefined);
              actionRef.current?.reload();
            }}
          />
          <InputNumber
            min={1}
            max={1000}
            value={rebuildLimit}
            onChange={(value) => setRebuildLimit(value || 200)}
            addonBefore="重算"
            addonAfter="单"
            style={{ width: 170 }}
          />
          <div className="erp-toolbar-spacer" />
          <Button icon={<ReloadOutlined />} onClick={() => actionRef.current?.reload()}>
            刷新
          </Button>
          <Button
            type="primary"
            icon={<CalculatorOutlined />}
            loading={rebuilding}
            onClick={rebuild}
          >
            重算利润
          </Button>
        </div>

        <ProTable<ERP.OrderProfitItem, ERP.FinanceQueryParams>
          rowKey="id"
          actionRef={actionRef}
          className="erp-dense-table"
          search={false}
          columns={columns}
          scroll={{ x: 1420 }}
          request={async (params) => {
            try {
              return await queryOrderProfits({
                ...params,
                shopId,
                keyword,
                startDate: dateRange?.[0],
                endDate: dateRange?.[1],
              });
            } catch {
              messageApi.error('订单利润列表请求失败');
              return { success: false, data: [], total: 0 };
            }
          }}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          locale={{ emptyText: '暂无利润快照，先点击重算利润' }}
        />
      </div>
    </div>
  );
};

export default FinanceReportPage;
