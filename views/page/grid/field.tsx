
// react
import { View, Hbs } from '@dashup/ui';
import React, { useState, useEffect } from 'react';
import { OverlayTrigger, Popover, Button } from 'react-bootstrap';

// page grid field
const PageGridField = (props = {}) => {
  // use state
  const [updated, setUpdated] = useState(new Date());
  const [prevent, setPrevent] = useState(false);

  // find field
  const { field, column, item, saving, bulk, saveBulk, saveItem, setSaving } = props;

  // check if custom
  if (column.field === 'custom') return (
    <div className="grid-column-content">
      <Hbs template={ column.view || '' } data={ item.toJSON() } />
    </div>
  );

  // on save
  const onSave = async () => {
    // await save
    await bulk ? saveBulk(item, field) : saveItem(item);

    // close
    if (typeof document?.body?.click === 'function') document.body.click();
  };

  // on updated
  const onUpdated = () => {
    // set updated
    setUpdated(new Date());
  };

  // use effect
  useEffect(() => {
    // check field
    if (!field) return;

    // on change
    item.on(field.name || field.value, onUpdated);

    // return done
    return () => {
      // off change
      item.removeListener(field.name || field.value, onUpdated);
    };
  }, [item && item.get('_id')]);

  // check content
  const content = !!field && (
    <div className="grid-column-content">
      <View
        view="view"
        type="field"
        item={ item }
        field={ field }
        value={ item.get(field.name || field.value) }
        struct={ field.type }
        dashup={ props.dashup }
        column={ column }
        >
        <div className="text-center">
          <i className="fa fa-spinner fa-spin" />
        </div>
      </View>
    </div>
  );

  // return jsx
  return field ? (
    props.dashup.can(props.page, 'submit') ? (
      <OverlayTrigger trigger="click" placement="bottom-start" className="grid-column-content" rootClose overlay={ (
        <Popover className="popover-grid">
          <div className="p-2">
            <View
              view="input"
              type="field"
              item={ item }
              field={ field }
              value={ item.get(field.name || field.value) }
              struct={ field.type }
              dashup={ props.dashup }
              column={ column }
              onChange={ (f, value) => item.set(field.name || field.value, value) }
              setPrevent={ setPrevent }
            >
              <div className="text-center">
                <i className="fa fa-spinner fa-spin" />
              </div>
            </View>
            <Button variant="primary" disabled={ saving || prevent } className="w-100" onClick={ (e) => onSave() }>
              { prevent ? 'Uploading...' : (
                saving ? 'Saving...' : (
                  bulk ? 
                  `Update ${(bulk?.total || 0).toLocaleString()} items` :
                  'Submit'
                )
              ) }
            </Button>
          </div>
        </Popover>
      ) }>
        { content }
      </OverlayTrigger>
    ) : content
  ) : null;
};

// export default
export default PageGridField;