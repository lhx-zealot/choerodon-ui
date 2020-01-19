import React, { ReactNode } from 'react';
import PropTypes from 'prop-types';
import { action, computed, isArrayLike, runInAction } from 'mobx';
import { observer } from 'mobx-react';
import isString from 'lodash/isString';
import isNumber from 'lodash/isNumber';
import isPlainObject from 'lodash/isPlainObject';
import defaultTo from 'lodash/defaultTo';
import isNil from 'lodash/isNil';
import KeyCode from 'choerodon-ui/lib/_util/KeyCode';
import { TextField, TextFieldProps } from '../text-field/TextField';
import autobind from '../_util/autobind';
import keepRunning from '../_util/keepRunning';
import Icon from '../icon';
import { getNearStepValues, getPrecision, MAX_SAFE_INTEGER, plus } from './utils';
import { ValidationMessages } from '../validator/Validator';
import isEmpty from '../_util/isEmpty';
import { $l } from '../locale-context';
import { FieldType } from '../data-set/enum';
import { ValidatorProps } from '../validator/rules';
import formatNumber from '../formatter/formatNumber';

function getCurrentValidValue(value: string): number {
  return Number(value.replace(/\.$/, '')) || 0;
}

export interface NumberFieldProps extends TextFieldProps {
  /**
   * 最小值
   */
  min?: number | null;
  /**
   * 最大值
   */
  max?: number | null;
  /**
   * 步距
   */
  step?: number;
}

export class NumberField<T extends NumberFieldProps> extends TextField<T & NumberFieldProps> {
  static displayName = 'NumberField';

  static propTypes = {
    /**
     * 最小值
     */
    min: PropTypes.number,
    /**
     * 最大值
     */
    max: PropTypes.number,
    /**
     * 步距
     */
    step: PropTypes.number,
    ...TextField.propTypes,
  };

  static defaultProps = {
    ...TextField.defaultProps,
    suffixCls: 'input-number',
  };

  static format = formatNumber;

  @computed
  get defaultValidationMessages(): ValidationMessages {
    const label = this.getProp('label');
    return {
      valueMissing: $l('NumberField', label ? 'value_missing' : 'value_missing_no_label', {
        label,
      }),
    };
  }

  @computed
  get allowDecimal(): boolean {
    const { min } = this;
    const step = this.getProp('step');
    return !step || (step as number) % 1 !== 0 || (!!min && (min as number) % 1 !== 0);
  }

  @computed
  get allowNegative(): boolean {
    const { min } = this;
    return isNil(min) || min < 0;
  }

  @computed
  get min(): number | undefined | null {
    return this.getLimit('min');
  }

  @computed
  get max(): number | undefined | null {
    return this.getLimit('max');
  }

  @computed
  get value(): any | undefined {
    const { value } = this.observableProps;
    if (isArrayLike(value)) {
      return value;
    }
    const { range } = this;
    if (isArrayLike(range)) {
      if (isPlainObject(value)) {
        const [start, end] = range;
        return {
          [start]: value[start],
          [end]: value[end],
        };
      }
    }
    return value;
  }

  set value(value: any | undefined) {
    runInAction(() => {
      this.observableProps.value = value;
    });
  }

  isLowerRange(value1: number, value2: number): boolean {
    return value1 < value2;
  }

  getFieldType(): FieldType {
    return FieldType.number;
  }

  getLimit(type: string): number | undefined | null {
    const { record } = this;
    const limit = this.getProp(type);
    if (record && isString(limit)) {
      const num = record.get(limit);
      if (num !== undefined) {
        return num;
      }
    }
    return limit;
  }

  getValidatorProps(): ValidatorProps {
    const { min, max } = this;
    const step = this.getProp('step');
    return {
      ...super.getValidatorProps(),
      min,
      max,
      step,
    };
  }

  getInnerSpanButton(): ReactNode {
    const { prefixCls, range } = this;
    const step = this.getProp('step');
    if (step && !range && !this.isReadOnly()) {
      return this.wrapperInnerSpanButton(
        <div>
          <Icon
            key="plus"
            type="keyboard_arrow_up"
            className={`${prefixCls}-plus`}
            onMouseDown={this.handlePlus}
          />
          <Icon
            key="minus"
            type="keyboard_arrow_down"
            className={`${prefixCls}-minus`}
            onMouseDown={this.handleMinus}
          />
        </div>,
      );
    }
  }

  @action
  handleEnterDown(e) {
    if (this.multiple && this.range && this.text) {
      this.prepareSetValue(this.text);
    }
    super.handleEnterDown(e);
    if (this.multiple && this.range) {
      this.setRangeTarget(0);
      this.beginRange();
    }
  }

  @autobind
  handleKeyDown(e) {
    if (!this.props.disabled && !this.isReadOnly()) {
      switch (e.keyCode) {
        case KeyCode.UP:
          this.handleKeyDownUp(e);
          break;
        case KeyCode.DOWN:
          this.handleKeyDownDown(e);
          break;
        default:
      }
    }
    super.handleKeyDown(e);
  }

  handleKeyDownUp(e) {
    e.preventDefault();
    if (this.getProp('step')) {
      this.step(true);
    }
  }

  handleKeyDownDown(e) {
    e.preventDefault();
    if (this.getProp('step')) {
      this.step(false);
    }
  }

  @keepRunning
  handlePlus() {
    this.step(true);
  }

  @keepRunning
  handleMinus() {
    this.step(false);
  }

  step(isPlus: boolean) {
    const min = defaultTo(this.min, -MAX_SAFE_INTEGER);
    const max = defaultTo(this.max, MAX_SAFE_INTEGER);
    const step = defaultTo(this.getProp('step'), 1);
    let newValue;
    const value =
      this.multiple || this.isFocused ? Number(this.text || this.getValue()) : this.getValue();
    if (!isNumber(value)) {
      newValue = defaultTo(this.min, 0);
    } else {
      const currentValue = getCurrentValidValue(String(value));
      newValue = currentValue;
      const nearStep = getNearStepValues(currentValue, step as number, min, max);
      if (nearStep) {
        switch (nearStep.length) {
          case 1:
            newValue = nearStep[0];
            break;
          case 2:
            newValue = nearStep[isPlus ? 1 : 0];
            break;
          default:
        }
      } else {
        const nextValue = plus(currentValue, (isPlus ? step : -step) as number);
        if (nextValue < min) {
          newValue = min;
        } else if (nextValue > max) {
          const nearMaxStep = getNearStepValues(max as number, step as number, min, max as number);
          if (nearMaxStep) {
            newValue = nearMaxStep[0];
          } else {
            newValue = max;
          }
        } else {
          newValue = nextValue;
        }
      }
    }
    if (this.value !== newValue) {
      if (this.multiple) {
        this.setText(String(newValue));
      } else {
        this.prepareSetValue(newValue);
      }
    }
  }

  prepareSetValue(value: any): void {
    super.prepareSetValue(isNaN(value) || isEmpty(value) ? null : Number(value));
  }

  restrictInput(value: string): string {
    if (value) {
      let restrict = '0-9';
      if (this.allowDecimal) {
        restrict += '.';
      }
      const isNegative = this.allowNegative && /^-/.test(value);
      value = super.restrictInput(value.replace(new RegExp(`[^${restrict}]+`, 'g'), ''));
      const values = value.split('.');
      if (values.length > 2) {
        value = `${values.shift()}.${values.join('')}`;
      }
      if (isNegative) {
        value = `-${value}`;
      }
    }
    return value;
  }

  getFormatOptions(value?: number): Intl.NumberFormatOptions | undefined {
    const precision = getPrecision(isNil(value) ? this.getValue() || 0 : value);
    return {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    };
  }

  getFormatter() {
    return formatNumber;
  }

  processText(value: string): string {
    return this.getFormatter()(value, this.lang, this.getFormatOptions(Number(value)));
  }
}

@observer
export default class ObserverNumberField extends NumberField<NumberFieldProps> {
  static defaultProps = NumberField.defaultProps;

  static format = formatNumber;
}
