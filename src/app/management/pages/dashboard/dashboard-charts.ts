import { EChartsCoreOption, graphic } from 'echarts/core';
import { DashboardAnalytics, DashboardRank, DashboardRevenue } from '../../models/dashboard.model';
import { appointmentStatusLabels } from '../../../utils/appointment/appointment-ui.utils';
import { AppointmentStatus } from '../../../models/appointment.model';

export const statusColors: Record<AppointmentStatus, string> = {
  PENDING: '#d48a12', CONFIRMED: '#2878ca', IN_PROGRESS: '#08979c',
  COMPLETED: '#27835a', CANCELLED: '#ce4848', NO_SHOW: '#d4380d'
};
const palette = ['#327856', '#589a71', '#7bb390', '#a1c9ad', '#bfdac5'];
const piePalette = ['#0284C7', '#0EA5E9', '#38BDF8', '#7DD3FC', '#BAE6FD', '#E0F2FE'];
const compact = (value: number) => new Intl.NumberFormat('vi-VN', {
  notation: 'compact',
  maximumFractionDigits: 1
}).format(value);
const day = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

function daily(labels: string[], values: number[], name: string, money = false): EChartsCoreOption {
  return {
    aria: { enabled: true }, animationDuration: 600,
    tooltip: {
      trigger: 'axis',
      confine: true,
      renderMode: 'richText',
      valueFormatter: (v: unknown) => `${Number(v).toLocaleString('vi-VN')}${money ? ' ₫' : ' lịch'}`
    },
    grid: { left: 12, right: 18, top: 30, bottom: labels.length > 60 ? 65 : 20, containLabel: true },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { formatter: day, color: '#718078', hideOverlap: true },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#dfe8e0' } }
    },
    yAxis: {
      type: 'value',
      minInterval: money ? undefined : 1,
      axisLabel: { formatter: compact, color: '#718078' },
      splitLine: { lineStyle: { color: '#edf2ed', type: 'dashed' } }
    },
    dataZoom: labels.length > 60 ? [{
      type: 'slider',
      height: 18,
      bottom: 5,
      start: 0,
      end: 100
    }, { type: 'inside' }] : [],
    series: [{
      name, type: money ? 'line' : 'bar', data: values, barMaxWidth: 30, smooth: false,
      symbolSize: 5, showSymbol: labels.length < 40,
      lineStyle: { width: 3, color: '#327856' },
      areaStyle: money ? {
        color: new graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#b1d4bb' }, {
          offset: 1,
          color: '#f5faf6'
        }])
      } : undefined,
      itemStyle: { color: '#589a71', borderRadius: [5, 5, 0, 0] }
    }]
  };
}

function donut(data: {
  name: string;
  value: number;
  count?: number;
  itemStyle?: { color: string };
}[], money = false): EChartsCoreOption {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const fontFamily = "'Inter', -apple-system, sans-serif";
  const centerText = (left: string, top: string) => ({
    id: 'donut-total', left, top, textAlign: 'center', textVerticalAlign: 'middle', padding: 0, triggerEvent: false,
    text: `{value|${compact(total)}${money ? ' ₫' : ''}}\n{caption|${money ? 'Tổng tiền đã thu' : 'Tổng lịch khám'}}`, 
    textStyle: {
      align: 'center', verticalAlign: 'middle',
      rich: {
        value: { color: '#0f172a', fontSize: 22, fontWeight: 900, fontFamily, lineHeight: 30, align: 'center' },
        caption: { color: '#94a3b8', fontSize: 11, fontFamily, lineHeight: 20, align: 'center' }
      }
    }
  });
  return {
    aria: { enabled: true }, color: piePalette,
    tooltip: {
      trigger: 'item', triggerOn: 'mousemove|click', enterable: true, confine: true,
      formatter: (params: any) => {
        const item = params.data;
        if (!item) return '';
        return `<div style="min-width:180px;font-family:Inter,sans-serif"><div style="font-weight:700;color:#0f172a;margin-bottom:8px">${escapeHtml(item.name)}</div><div>${money ? 'Tiền đã thu' : 'Số lịch khám'}: <b>${Number(item.value).toLocaleString('vi-VN')}${money ? ' ₫' : ''}</b></div>${money && item.count != null ? `<div>Thanh toán thành công: <b>${item.count}</b></div>` : ''}<div>Tỷ trọng: <b>${Number(params.percent ?? 0).toFixed(1)}%</b></div></div>`;
      }
    },
    legend: {
      orient: 'vertical', left: 10, top: 'middle', type: 'scroll', itemWidth: 12, itemHeight: 12, itemGap: 8,
      textStyle: { fontFamily, fontSize: 14, fontWeight: 700, color: '#334155' },
      formatter: (name: string) => name.length > 14 ? name.slice(0, 14) + '…' : name
    },
    series: [{
      type: 'pie', radius: ['48%', '75%'], center: ['62%', '50%'],
      data: data.map((item, index) => ({ ...item, itemStyle: { color: piePalette[index % piePalette.length] } })), padAngle: 2,
      itemStyle: { borderRadius: 6 },
      label: { show: true, position: 'outside', formatter: (p: any) => `${Number(p.percent ?? 0).toFixed(1)}%`, fontFamily, fontSize: 13, fontWeight: 800, color: '#334155' },
      labelLine: { show: true, length: 12, length2: 8 },
      emphasis: { scaleSize: 6, itemStyle: { shadowBlur: 12, shadowColor: 'rgba(0,0,0,0.15)' } },
      animationType: 'scale', animationDuration: 800, animationEasing: 'cubicOut'
    }],
    title: centerText('62%', '50%'),
    media: [{ query: { maxWidth: 440 }, option: {
      legend: { orient: 'horizontal', left: 'center', top: 'auto', bottom: 0, textStyle: { fontSize: 11 } },
      series: [{ center: ['50%', '43%'], radius: ['42%', '65%'] }],
      title: centerText('50%', '43%')
    } }]
  };
}
// Adapted from check1: rounded gradient horizontal bars, compact labels and donut slices.
export function rankChart(rows: DashboardRank[]): EChartsCoreOption {
  return {
    aria: { enabled: true }, tooltip: { trigger: 'axis', confine: true, renderMode: 'richText' },
    grid: { left: 8, right: 38, top: 14, bottom: 12, containLabel: true },
    xAxis: { type: 'value', show: false, minInterval: 1 },
    yAxis: {
      type: 'category',
      inverse: true,
      data: rows.map(r => r.name),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { width: 120, overflow: 'truncate', color: '#365341' }
    },
    series: [{
      name: 'Lượt khám', type: 'bar', barMaxWidth: 30,
      data: rows.map((r, i) => ({
        value: r.count,
        itemStyle: {
          borderRadius: [0, 6, 6, 0],
          color: new graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: palette[i % palette.length] }, {
            offset: 1,
            color: '#a9cdb4'
          }])
        }
      })),
      label: { show: true, position: 'right', color: '#365341', fontWeight: 700 }, animationDuration: 600
    }]
  };
}

export function analyticsCharts(data: DashboardAnalytics) {
  return {
    appointments: daily(data.dailyAppointments.map(d => d.date), data.dailyAppointments.map(d => d.count), 'Lịch khám'),
    statuses: donut((Object.keys(statusColors) as AppointmentStatus[]).map(status => ({
      name: appointmentStatusLabels[status],
      value: data.statusCounts[status],
      itemStyle: { color: statusColors[status] }
    })).filter(d => d.value > 0))
  };
}

export function revenueCharts(data: DashboardRevenue) {
  return {
    daily: daily(data.dailyRevenue.map(d => d.date), data.dailyRevenue.map(d => d.collectedAmount), 'Tiền đã thu', true),
    methods: donut(data.byPaymentMethod.filter(d => d.collectedAmount > 0).map(d => ({
      name: paymentMethodLabel(d.method),
      value: d.collectedAmount, count: d.successfulPayments
    })), true)
  };
}

export function paymentMethodLabel(method: string): string {
  return ({
    PAYOS: 'payOS',
    CASH: 'Tiền mặt',
    BANK_TRANSFER: 'Chuyển khoản',
    BANK: 'Chuyển khoản',
    CARD: 'Thẻ'
  } as Record<string, string>)[method] ?? method;
}
