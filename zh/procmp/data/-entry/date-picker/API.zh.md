---
title: API
---

### DatePicker

| 参数         | 说明                                                                             | 类型                                                        | 默认值 |
| ------------ | -------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------ |
| min          | 最小日期                                                                         | MomentInput                                                 |        |
| max          | 最大日期                                                                         | MomentInput                                                 |        |
| format       | 日期格式，如 `YYYY-MM-DD HH:mm:ss`                                               | string                                                      |        |
| step         | 时间步距                                                                         | { hour: number, minute: number, second: number }            |        |
| filter       | 日期过滤                                                                         | (currentDate, selected) => boolean                          |        |
| cellRenderer | 单元格渲染, view 可选值：`date` `dateTime` `time` `week` `month` `year` `decade` | (view) => (props, text, currentDate, selected) => ReactNode |        |

更多属性请参考 [TriggerField](/zh/procmp/abstract/trigger-field/#TriggerField)。

<style>
.code-box-demo .c7n-pro-calendar-picker-wrapper {
  margin-bottom: .1rem;
}
</style>