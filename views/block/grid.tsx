
// import react
import { Hbs, View, Grid } from '@dashup/ui';
import ReactPerfectScrollbar from 'react-perfect-scrollbar';
import { OverlayTrigger, Popover, Button } from 'react-bootstrap';
import React, { useState } from 'react';

// block list
const BlockGrid = (props = {}) => {
  // groups
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prevent, setPrevent] = useState(false);
  const [selected, setSelected] = useState({ type : 'items', items : [] });

  // load data
  const loadData = async () => {
    // get model page
    const model = props.block.model || props.model;

    // check model page
    if (!model) return null;

    // get model page
    const modelPage = props.dashup.page(model);

    // get query
    const query = props.getQuery(modelPage);
    
    // list
    return {
      items : await query.skip(skip).limit(limit).listen(),
      total : await props.getQuery(modelPage).count(),
    };
  };

  // get forms
  const getForms = () => {
    // get model
    const model = props.block.model || props.model;

    // check model
    if (!model) return [];

    // get forms
    return props.getForms([model]);
  };

  // get fields
  const getFields = () => {
    // return fields
    return props.getFields(getForms());
  };

  // render field
  const renderField = (item, column) => {
    // find field
    const field = props.getField(column.field, getFields());

    // save item
    const saveItem = async () => {
      // set saving
      setSaving(true);

      // save
      await item.save();

      // set saving
      setSaving(false);
    };

    // check if custom
    if (column.field === 'custom') return (
      <div className="grid-column-content">
        <Hbs template={ column.view || '' } data={ item.toJSON() } />
      </div>
    );

    // return no field
    return field && (
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
            <Button variant="primary" disabled={ saving || prevent } className="w-100" onClick={ (e) => saveItem() }>
              { prevent ? 'Uploading...' : (saving ? 'Saving...' : 'Submit') }
            </Button>
          </div>
        </Popover>
      ) }>
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
      </OverlayTrigger>
    );
  };

  // set actions
  const actions = [
    ...(getForms().map((form) => {
      return {
        id      : form.get('_id'),
        icon    : form.get('icon'),
        content : form.get('name'),
      };
    })),

    ...(getForms().length ? ['divider'] : []),

    ...(getForms()[0] && getForms()[0].get ? [{
      id   : 'remove',
      href : (item) => {
        return getForms()[0] ? `/app/${getForms()[0].get('_id')}/${item.get('_id')}/remove?redirect=/app/${props.page.get('_id')}` : null;
      },
      icon    : 'trash fas',
      content : 'Remove',
      variant : 'danger',
    }] : []),
  ];

  // set sort
  const setSort = async (column, way) => {
    // let sort
    let sort;
    
    // set sort
    if (!column) {
      sort = null;
    } else {
      // create sort
      sort = {
        way,
  
        id    : column.id,
        sort  : column.sort,
        field : column.field,
      };
    }

    // set loading
    setLoading(true);

    // set data
    await props.setBlock(props.block, 'sort', sort);

    // set loading
    setLoading(false);
  };

  // set columns
  const setColumns = async (columns) => {
    // set page data
    props.setBlock(props.block, 'columns', columns);
  };

  // is selected
  const isSelected = (item) => {
    // check type
    if (selected.type === 'all') return true;
    if (selected.type === 'items') return selected.items.includes(item.get('_id'));
    if (selected.type === 'minus') return !selected.items.includes(item.get('_id'));
  };

  // on select
  const onSelect = (item) => {
    // set selected

    // check type
    if (item === 'clear') {
      // fix clear
      selected.type  = 'items';
      selected.items = [];
    } else if (item === 'all') {
      if (selected.type === 'all') {
        selected.type = 'items';
      } else {
        selected.type  = 'all';
        selected.items = [];
      }
    } else {
      // is selected
      const isItemSelected = isSelected(item);
  
      // check type
      if (selected.type === 'all') {
        selected.type  = 'minus';
        selected.items = [item.get('_id')];
      } else if (selected.type === 'items' && isItemSelected) {
        // set item
        selected.items = selected.items.filter((id) => id !== item.get('_id'));
      } else if (selected.type === 'minus' && isItemSelected) {
        // push item
        selected.items.push(item.get('_id'));
      } else if (!isItemSelected) {
        // check minus
        if (selected.type === 'minus') {
          // filter minused item
          selected.items = selected.items.filter((id) => id !== item.get('_id'));

          // check minus
          if (!selected.items.length) selected.type = 'all';
        } else {
          // push
          selected.items.push(item.get('_id'));
        }
      }
    }

    // total
    if (selected.type === 'all') selected.total = total;
    if (selected.type === 'minus') selected.total = total - (selected.items.length);
    if (selected.type === 'items') selected.total = selected.items.length;

    // set selected
    setSelected({ ...selected });
  };

  // return jsx
  return (
    <div className={ `flex-1 d-flex flex-column h-100 w-100${props.block.background ? ' card' : ''}` }>
      { !!props.block.label && (
        <div className={ props.block.background ? 'card-header' : 'mb-2' }>
          <b>{ props.block.label }</b>
        </div>
      ) }
      { loading ? (
        <div className={ `text-center${props.block.background ? ' card-body' : ''}` }>
          <i className="fa fa-spinner fa-spin" />
        </div>
      ) : (
        !getForms().length ? (
          <div className={ `text-center${props.block.background ? ' card-body' : ''}` }>
            <p>
              Please configure this grid.
            </p>
          </div>
        ) : (
          <div className={ `d-flex flex-1 ${props.block.background ? ' card-body' : ''}` }>
            <Grid
              id={ props.block.uuid }
              skip={ skip }
              sort={ props.block.sort || {} }
              limit={ limit }
              columns={ props.block.columns || [] }
              available={ getFields() }
  
              canAlter={ props.dashup.can(getForms()[0], 'alter') }
              canSubmit={ props.dashup.can(getForms()[0], 'submit') }
  
              setSort={ setSort }
              setSkip={ setSkip }
              actions={ actions }
              loadData={ loadData }
              setLimit={ setLimit }
              setColumns={ setColumns }
              renderField={ renderField }

              fullHeight
            >
              <Grid.Group
                onSelect={ onSelect }
                selected={ selected }
                isSelected={ isSelected }
              />
            </Grid>
          </div>
        )
      ) }
    </div>
  );
};

// export block list
export default BlockGrid;