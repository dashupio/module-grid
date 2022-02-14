
// import react
import shortid from 'shortid';
import { Box, DataGrid } from '@dashup/ui';
import React, { useRef, useState, useEffect } from 'react';
import { Hbs, Icon, Stack, TextField, IconPicker, Dialog, DialogTitle, DialogContentText, DialogContent, DialogActions, Color, Button, IconButton, colors, useTheme, Menu, Modal, MenuItem, Divider, Tooltip, Page, View, ListItemIcon, ListItemText, CircularProgress, GridActionsCellItem, GridColumnMenuContainer, SortGridMenuItems, LoadingButton } from '@dashup/ui';

// scss
import '../page/grid.scss';

// debounce
let timeout = null;

// debounce
const debounce = (fn, to = 200) => {
  clearTimeout(timeout);
  timeout = setTimeout(fn, to);
};

// block list
const BlockGrid = (props = {}) => {
  // theme
  const theme = useTheme();

  // groups
  const [skip, setSkip] = useState(0);
  const [icon, setIcon] = useState(false);
  const [form, setForm] = useState(null);
  const [color, setColor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState(new Date());
  const [selected, setSelected] = useState({ type : 'items', items : [] });
  const [updating, setUpdating] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [colorMenu, setColorMenu] = useState(null);
  const [disableSort, setDisableSort] = useState(false);
  const [removingItem, setRemovingItem] = useState(null);

  // data elements
  const [data, setData] = useState({});

  // wrap ref
  const wrapRef = useRef(null);

  // test page
  const testPage = !!props.model && props.dashup.page(props.model);

  // full width
  const fullWidth = wrapRef.current?.scrollWidth;

  // set actions
  const actions = [
    ...(!!props.model && props.dashup.can(testPage, 'submit') && props.getForms()[0] && props.getForms()[0].get ? [{
      id      : props.getForms()[0].get('_id'),
      icon    : <Icon type="fas" icon="pencil" fixedWidth />,
      label   : props.getForms()[0].get('name'),
      onClick : (item) => {
        setForm(props.getForms()[0].get('_id'));
        props.setItem(item);
      }
    }] : []),

    ...(!!props.model && props.dashup.can(testPage, 'submit') && props.getForms()[0] && props.getForms()[0].get ? [{
      id    : 'remove',
      icon  : <Icon type="fas" icon="trash" fixedWidth />,
      label : 'Remove',
      color : 'error',
      onClick : (item) => {
        setRemovingItem(item);
      }
    }] : []),
  ];

  ////////////////////////////////////////////////////////////////////////////////
  //
  // get model methods
  //
  ////////////////////////////////////////////////////////////////////////////////

  // get model
  const getModel = () => {
    // return model
    return !!props.model && props.dashup.page(props.model);
  };

  // get forms
  const getForms = () => {
    // get model
    const modelPage = getModel();

    // check model page
    if (!modelPage) return;

    // forms
    return (props.block.forms || []).map((id) => props.dashup.page(props.model));
  };

  // get fields
  const getFields = () => {
    // return accum
    return (getForms() || []).reduce((accum, page) => {
      // push
      accum.push(...(page.get('data.fields') || []));

      // return accum
      return accum;
    }, []);
  };

  // get item
  const getField = (field) => {
    // get groupBy field
    return getFields().find((f) => f.uuid === field || f.name === field);
  };

  ////////////////////////////////////////////////////////////////////////////////
  //
  // async load methods
  //
  ////////////////////////////////////////////////////////////////////////////////

  // load everything
  const load = async () => {
    // load groups
    setLoading(true);

    // set data
    setData({
      0 : await loadData(),
    });
    
    // set loading
    setLoading(false);
  };

  // load data
  const loadData = async () => {
    // get query
    const getQuery = () => {
      // return where
      return getModel();
    };

    // check query
    if (!getQuery()) return {
      total : 0,
      items : [],
    };

    // get total
    const newTotal = await getQuery().count();

    // return items
    return {
      total : newTotal,
      items : await getQuery().skip(skip).limit(props.block.limit || 25).listen(),
    };
  };

  ////////////////////////////////////////////////////////////////////////////////
  //
  // async save methods
  //
  ////////////////////////////////////////////////////////////////////////////////

  // on sort
  const onSort = ([sort]) => {
    // get field
    let field = sort?.field && getField(sort.field);

    // check sort
    if (props.block.sort?.field === sort?.field && !sort.sort) {
      // sort
      if (props.block.sort?.way === 1) {
        sort.sort = 'desc';
      }
    }

    // check sort
    if (sort?.field && !sort.sort) sort.sort = 'asc';

    // check sort
    if (props.block.sort?.field === sort?.field && props.block.sort?.way === -1) {
      field = null;
    }

    // sort
    props.setBlock(props.block, 'sort', field ? {
      way   : sort.sort === 'asc' ? 1 : -1,
      field : field.uuid || sort?.field,
    } : null);
  };

  // save bulk
  const saveBulk = async (item, field) => {
    // do bulk update
    await props.dashup.rpc({
      page   : props.page.get('_id'),
      form   : props.getForms()[0].get('_id'),
      model  : props.getModels()[0].get('_id'),
      dashup : props.dashup.get('_id'),
    }, 'model.bulk', {
      by    : selected.type,
      type  : 'update',
      items : selected.items,
      query : props.getQuery().query,
    }, {
      [field.name || field.uuid] : item.toJSON()[field.name || field.uuid],
    });
  };

  // save bulk
  const removeBulk = async () => {
    // do bulk update
    await props.dashup.rpc({
      page   : props.page.get('_id'),
      form   : props.getForms()[0].get('_id'),
      model  : props.getModels()[0].get('_id'),
      dashup : props.dashup.get('_id'),
    }, 'model.bulk', {
      by    : selected.type,
      type  : 'remove',
      items : selected.items,
      query : props.getQuery().query,
    });

    // reset selected
    selected.type  = 'items';
    selected.items = [];

    // set to page
    setSelected({ ...selected });
  };

  ////////////////////////////////////////////////////////////////////////////////
  //
  // set methods
  //
  ////////////////////////////////////////////////////////////////////////////////

  // set columns
  const setColumns = async (columns, force = false) => {
    // force
    if (force) return props.setBlock(props.block, 'columns', columns);

    // set page data
    debounce(() => props.setBlock(props.block, 'columns', columns), 200);
  };

  // add column
  const addColumn = (data, force = false) => {
    // coplumns
    const columns = props.block.columns || [];

    // return
    if (data.field !== 'custom' && columns.find((c) => c.field === data.field)) {
      return;
    }

    // push
    columns.push({
      ...data,
      id : shortid(),
    });
    
    // update columns
    setColumns(columns, true);
  };

  // add column
  const removeColumn = (id, force = false) => {
    // coplumns
    const columns = (props.block.columns || []).filter((c) => c.id !== id);
    
    // update columns
    setDisableSort(true);
    setColumns(columns, force);

    // timeout
    setTimeout(() => setDisableSort(false), 500);
  };

  // update column
  const setColumn = (id, updates) => {
    // find column
    const column = (props.block.columns || []).find((c) => c.id === id);

    // set updates
    Object.keys(updates).forEach((key) => column[key] = updates[key]);
    
    // update columns
    setColumns(props.block.columns);
  };

  // order column
  const orderColumn = (id, oldIndex, newIndex) => {
    // find column
    const column = (props.block.columns || []).find((c) => c.id === id);
    const columns = (props.block.columns || []).filter((c) => c.id !== id);

    // splice
    columns.splice(newIndex - 1, 0, column);

    // set columns
    setColumns(columns);
  };

  ////////////////////////////////////////////////////////////////////////////////
  //
  // get methods
  //
  ////////////////////////////////////////////////////////////////////////////////

  // get item
  const getItem = (key, id) => {
    // return item
    return (data[key] || {}).items.find((item) => item.get('_id') === id);
  };

  // get sort
  const getSort = () => {
    // disable
    if (disableSort) return [];

    // get field
    const field = props.block?.sort?.field && getField(props.block?.sort?.field);

    // field
    return (field && (props.block.columns || []).find((c) => c.field === field.uuid)) ? [{
      sort  : props.block?.sort?.way === 1 ? 'asc' : 'desc',
      field : field.name || field.uuid,
    }] : [];
  };

  // get rows
  const getRows = ({ items }) => {
    // return items
    return [...(items || []).map((item) => {
      // return column
      return {
        id : item.get('_id'),
  
        ...(item.get()),
      };
    })];
  };

  // get columns
  const getColumns = (key) => {
    // return values
    return [...((props.block.columns || []).map((col) => {
      // get field
      const field = getField(col.field);
  
      // return column
      return {
        renderCell     : (opts) => renderCell(opts, key, field, col),
        renderEditCell : (opts) => renderEditCell(opts, key, field, col),
  
        id         : col.id,
        field      : col.field === 'custom' ? col.id : field?.name || field?.uuid || col.field,
        width      : col.width || (col.basis && fullWidth ? ((fullWidth - 200) * (col.basis / 100)) : null),
        editable   : col.field !== 'custom',
        sortable   : col.field !== 'custom' || !!col.sort,
        resizable  : true,
        headerName : col.title,
      };
    })),
    {
      id         : 'actions',
      type       : 'actions',
      field      : 'actions',
      width      : 100,
      editable   : false,
      resizable  : false,
      headerName : 'Actions',
      getActions : ({ id }) => {
        // return jsx
        return actions.map((action) => {
          // return jsx
          return <GridActionsCellItem
            { ...action }
            key={ action.id }
            onClick={ () => action.onClick(getItem(key, id)) }
          />;
        });
      },
    }];
  };

  ////////////////////////////////////////////////////////////////////////////////
  //
  // render methods
  //
  ////////////////////////////////////////////////////////////////////////////////

  // render cell
  const renderCell = ({ id }, key, field, col) => {
    // get item
    const item = getItem(key, id);

    // check item
    if (!item) return null;

    // custom
    if (col.field === 'custom') {
      // return data
      return (
        <Hbs
          data={ item ? item.toJSON() : {} }
          template={ col.view || '' }
          isInline
        />
      );
    }

    // return jsx
    return field && (
      <View
        view="view"
        type="field"
        item={ item }
        field={ field }
        value={ item.get(field?.name || field?.value) }
        struct={ field?.type }
        dashup={ props.dashup }
        column={ col }
      >
        <CircularProgress />
      </View>
    );
  };

  // render edit cell
  const renderEditCell = ({ id }, key, field, col) => {
    // get item
    const item = getItem(key, id);

    // check item
    if (!item) return null;

    // return jsx
    return (
      <View
        isInline
        autoFocus

        view="input"
        type="field"
        item={ item }
        field={ field }
        value={ item.get(field?.name || field?.uuid) }
        struct={ field?.type }
        dashup={ props.dashup }
        column={ col }
        onChange={ async (f, value) => {
          // save
          item.set(field?.name || field?.uuid, value);
          await item.save();
        } }
      >
        <CircularProgress />
      </View>
    );
  };

  // use effect
  useEffect(() => {
    // on update
    const onUpdate = () => {
      debounce(() => setUpdated(new Date()));
    };

    // load groups
    load();
  }, [
    skip,
    updated,
    props.block.model,
    props.block.forms,
    props.block.limit,
    props.block.search,
  ]);

  // create menu
  const ColumnMenuComponent = (subProps = {}) => {
    // props
    const { hideMenu, currentColumn, ...other } = subProps;

    // nothing
    if (currentColumn.type === 'actions') return null;

    // return jsx
    return (
      <GridColumnMenuContainer
        hideMenu={ hideMenu }
        currentColumn={ currentColumn }
        { ...other }
      >
        <SortGridMenuItems onClick={ hideMenu } column={ currentColumn! } />

        <Divider />
        <MenuItem onClick={ (e) => setUpdating((props.block.columns || []).find((c) => c.id === currentColumn.id)) }>
          <ListItemIcon>
            <Icon type="fas" icon="pencil" />
          </ListItemIcon>
          <ListItemText>
            Update Column
          </ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={ (e) => setRemoving((props.block.columns || []).find((c) => c.id === currentColumn.id)) } sx={ {
          color : 'error.main',
        } }>
          <ListItemIcon sx={ {
            color : 'error.main',
          } }>
            <Icon type="fas" icon="trash" />
          </ListItemIcon>
          <ListItemText>
            Remove Column
          </ListItemText>
        </MenuItem>
      </GridColumnMenuContainer>
    );
  };

  // update jsx
  const updateJsx = !!updating && (
    <>
      <Modal
        open={ !!updating }
        title={ updating.title || updating.label }
        thread={ updating.id }
        dashup={ props.dashup }
        onClose={ () => setUpdating(null) }
      >
        <Box pt={ 4 } pb={ 2 }>
          <Stack direction="row" spacing={ 2 }>
            <Button variant="contained" onClick={ (e) => setColorMenu(e.target) } sx={ {
              color           : updating.color?.hex && theme.palette.getContrastText(updating.color?.hex),
              backgroundColor : updating.color?.hex,
            } }>
              <Icon icon={ updating.icon || 'pencil' } fixedWidth />
            </Button>
            <TextField
              label="Name"
              onChange={ (e) => setColumn(updating.id, {
                title : e.target.value
              }) }
              defaultValue={ updating.title }
              fullWidth
            />
          </Stack>
          { updating.field === 'custom' && (
            <Box mt={ 2 }>
              <View
                type="field"
                view="input"
                mode="handlebars"
                struct="code"
                field={ {
                  label : 'Display'
                } }
                value={ updating.view }
                dashup={ props.dashup }
                onChange={ (e, view) => setColumn(updating.id, { view }) }
              />
            </Box>
          ) }
        </Box>
      </Modal>
      <Menu
        open={ !!colorMenu }
        onClose={ () => setColorMenu(null) }
        anchorEl={ colorMenu }
      >
        <MenuItem onClick={ (e) => !setIcon(colorMenu) && setColorMenu(false) }>
          <ListItemIcon>
            <Icon icon={ updating.icon || 'pencil' } />
          </ListItemIcon>
          <ListItemText>
            Change Icon
          </ListItemText>
        </MenuItem>
        <MenuItem onClick={ (e) => !setColor(colorMenu) && setColorMenu(false) }>
          <ListItemIcon>
            <Icon type="fas" icon="tint" />
          </ListItemIcon>
          <ListItemText>
            Change Color
          </ListItemText>
        </MenuItem>
      </Menu>

      { !!icon && <IconPicker target={ icon } show icon={ updating.icon } onClose={ () => setIcon(false) } onChange={ (icon) => setColumn(updating.id, { icon }) } /> }
      { !!color && <Color target={ color } show color={ updating.color?.hex } colors={ Object.values(colors) } onClose={ () => setColor(false) } onChange={ (hex) => setColumn(updating.id, { color : hex.hex === 'transparent' ? null : hex }) } /> }
    </>
  );

  // remove jsx
  const removeJsx = !!removing && (
    <Dialog
      open={ !!removing }
      onClose={ () => setRemoving(null) }
    >
      <DialogTitle>
        Confirm Remove
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to remove this column?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={ () => setRemoving(null) }>Cancel</Button>
        <Button color="error" onClick={ (e) => !setRemoving(null) && removeColumn(removing.id) }>
          Remove
        </Button>
      </DialogActions>
    </Dialog>
  );

  // remove jsx
  const removeItemJsx = !!removingItem && (
    <Dialog
      open={ !!removingItem }
      onClose={ () => setRemovingItem(null) }
    >
      <DialogTitle>
        Confirm Remove
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to remove this item?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={ () => setRemovingItem(null) } disabled={ !!loading }>Cancel</Button>
        <LoadingButton color="error" disabled={ !!loading } loading={ !!loading } onClick={ async (e) => {
          // removing
          setLoading(true);

          // remove item
          await removingItem.remove();

          // loading
          setLoading(false);
          setUpdated(new Date());
          setRemovingItem(null);
        } }>
          Remove
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );

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
          <DataGrid
            pagination
            checkboxSelection

            rows={ getRows(data[key]) }
            columns={ getColumns(key) }
            loading={ loading }
            pageSize={ props.block.limit || 25 }
            rowCount={ data[key].total || 0 }
            sortModel={ getSort() }
            onPageChange={ (newPage) => setSkip((props.block.limit || 25) * newPage) }
            paginationMode="server"
            onColumnResize={ ({ colDef }) => debounce(() => setColumn(colDef.id, { width : colDef.width })) }
            onColumnOrderChange={ ({ colDef, oldIndex, targetIndex }) => orderColumn(colDef.id, oldIndex, targetIndex) }
            onPageSizeChange={ (newPageSize) => props.setBlock(props.block, 'limit', newPageSize) }
            onSortModelChange={ (model) => onSort(model) }
            rowsPerPageOptions={ [25, 50, 75, 100] }

            components={ {
              ColumnMenu : ColumnMenuComponent,
            } }
          />
        )
      ) }

      { updateJsx }
      { removeJsx }
      { removeItemJsx }
    </div>
  );
};

// export block list
export default BlockGrid;