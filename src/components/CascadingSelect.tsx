'use client';

import type { Schema } from '@/lib/types';

interface CascadingSelectProps {
  schema: Schema;
  table: string;
  subcategory: string;
  lineItem: string;
  onTableChange: (value: string) => void;
  onSubcategoryChange: (value: string) => void;
  onLineItemChange: (value: string) => void;
  disabled?: boolean;
}

const selectStyle = { color: '#000000', backgroundColor: '#ffffff' };
const disabledStyle = { color: '#6b7280', backgroundColor: '#f9fafb' };

export default function CascadingSelect({
  schema,
  table,
  subcategory,
  lineItem,
  onTableChange,
  onSubcategoryChange,
  onLineItemChange,
  disabled = false,
}: CascadingSelectProps) {
  const availableSubcategories = table ? schema.subcategories[table] || [] : [];

  const lineItemKey = `${table}|${subcategory}`;
  const availableLineItems =
    table && subcategory ? schema.lineItems[lineItemKey] || [] : [];

  const handleTableChange = (value: string) => {
    onTableChange(value);
    onSubcategoryChange('');
    onLineItemChange('');
  };

  const handleSubcategoryChange = (value: string) => {
    onSubcategoryChange(value);
    onLineItemChange('');
  };

  return (
    <div className="space-y-4">
      <div className="form-group">
        <label htmlFor="table" className="form-label">
          Table *
        </label>
        <select
          id="table"
          value={table}
          onChange={(e) => handleTableChange(e.target.value)}
          className="form-input"
          style={disabled ? disabledStyle : selectStyle}
          disabled={disabled}
          required
        >
          <option value="">Select table...</option>
          {schema.tables.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="subcategory" className="form-label">
          Subcategory *
        </label>
        <select
          id="subcategory"
          value={subcategory}
          onChange={(e) => handleSubcategoryChange(e.target.value)}
          className="form-input"
          style={disabled || !table ? disabledStyle : selectStyle}
          disabled={disabled || !table}
          required
        >
          <option value="">
            {table ? 'Select subcategory...' : 'Select table first'}
          </option>
          {availableSubcategories.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="lineItem" className="form-label">
          Line Item *
        </label>
        <select
          id="lineItem"
          value={lineItem}
          onChange={(e) => onLineItemChange(e.target.value)}
          className="form-input"
          style={disabled || !subcategory ? disabledStyle : selectStyle}
          disabled={disabled || !subcategory}
          required
        >
          <option value="">
            {subcategory ? 'Select line item...' : 'Select subcategory first'}
          </option>
          {availableLineItems.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
