
// import react
import SimpleBar from 'simplebar-react';
import React, { useState } from 'react';
import { Hbs, View, Grid, OverlayTrigger, Popover, Button } from '@dashup/ui';

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

    // total
    const total = await props.getQuery(modelPage).count();

    // set total
    setTotal(total)
    
    // list
    return {
      total,
      items : await query.skip(skip).limit(limit).listen(),
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
  const setSort = async (column, way = 1) => {
    // let sort
    let sort;

    // check field
    if (
      column && props.block.sort &&
      ((column.field !== 'custom' && column.field === props.block.sort?.field) ||
      (column.field === 'custom' && column.sort === props.block.sort?.sort))
    ) {
      // reverse sort
      if (props.page.get('data.sort.way') === -1) {
        column = null;
      } else {
        way = -1;
      }
    }
    
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

    // set data
    await props.setBlock(props.block, 'sort', sort);
  };

  // set columns
  const setColumns = async (columns) => {
    // set page data
    props.setBlock(props.block, 'columns', columns);
  };

  // is selected
  const isSelected = (item) => {
    // sub selected
    const subSelected = props.selected || selected;

    // check type
    if (subSelected.type === 'all') return true;
    if (subSelected.type === 'items') return subSelected.items.includes(item.get('_id'));
    if (subSelected.type === 'minus') return !subSelected.items.includes(item.get('_id'));
  };

  // on select
  const onSelect = (item) => {
    // sub selected
    const subSelected = { ...(props.selected || selected) };

    // check type
    if (item === 'clear') {
      // fix clear
      subSelected.type  = 'items';
      subSelected.items = [];
    } else if (item === 'all') {
      if (subSelected.type === 'all') {
        subSelected.type = 'items';
      } else {
        subSelected.type  = 'all';
        subSelected.items = [];
      }
    } else {
      // is selected
      const isItemSelected = isSelected(item);
  
      // check type
      if (subSelected.type === 'all') {
        subSelected.type  = 'minus';
        subSelected.items = [item.get('_id')];
      } else if (subSelected.type === 'items' && isItemSelected) {
        // set item
        subSelected.items = subSelected.items.filter((id) => id !== item.get('_id'));
      } else if (subSelected.type === 'minus' && isItemSelected) {
        // push item
        subSelected.items.push(item.get('_id'));
      } else if (!isItemSelected) {
        // check minus
        if (subSelected.type === 'minus') {
          // filter minused item
          subSelected.items = subSelected.items.filter((id) => id !== item.get('_id'));

          // check minus
          if (!subSelected.items.length) subSelected.type = 'all';
        } else {
          // push
          subSelected.items.push(item.get('_id'));
        }
      }
    }

    // total
    if (subSelected.type === 'all') subSelected.total = total;
    if (subSelected.type === 'minus') subSelected.total = total - (subSelected.items.length);
    if (subSelected.type === 'items') subSelected.total = subSelected.items.length;

    // set selected
    if (props.setSelected) return props.setSelected(subSelected);

    // set selected
    setSelected({ ...subSelected });
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
            <div className="h-100 w-100 fit-content">
              <SimpleBar className="h-100 simplebar-flex">
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
                    selected={ props.selected || selected }
                    isSelected={ isSelected }
                  />
                </Grid>
              </SimpleBar>
            </div>
          </div>
        )
      ) }
    </div>
  );
};

// export block list
export default BlockGrid;