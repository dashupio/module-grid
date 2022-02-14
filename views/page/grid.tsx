
// import dependencies
import shortid from 'shortid';
import { Box, DataGrid } from '@dashup/ui';
import React, { useRef, useState, useEffect } from 'react';
import { Hbs, Icon, Stack, TextField, IconPicker, Dialog, DialogTitle, DialogContentText, DialogContent, DialogActions, Color, Button, IconButton, colors, useTheme, Menu, Modal, MenuItem, Divider, Tooltip, Page, View, ListItemIcon, ListItemText, CircularProgress, GridActionsCellItem, GridColumnMenuContainer, SortGridMenuItems, LoadingButton } from '@dashup/ui';

// scss
import './grid.scss';

// debounce
let timeout = null;

// debounce
const debounce = (fn, to = 200) => {
  clearTimeout(timeout);
  timeout = setTimeout(fn, to);
};

// create gallery page
const PageGrid = (props = {}) => {
  // theme
  const theme = useTheme();

  // groups
  const [skip, setSkip] = useState(0);
  const [icon, setIcon] = useState(false);
  const [form, setForm] = useState(null);
  const [color, setColor] = useState(false);
  const [share, setShare] = useState(false);
  const [config, setConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState(new Date());
  const [selected, setSelected] = useState({ type : 'items', items : [] });
  const [updating, setUpdating] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [colorMenu, setColorMenu] = useState(null);
  const [columnMenu, setColumnMenu] = useState(null);
  const [disableSort, setDisableSort] = useState(false);
  const [removingItem, setRemovingItem] = useState(null);

  // data elements
  const [data, setData] = useState({});
  const [groups, setGroups] = useState(null);

  // wrap ref
  const wrapRef = useRef(null);

  // required
  const required = typeof props.required !== 'undefined' ? props.required : [{
    key   : 'data.model',
    label : 'Model',
  }, {
    key   : 'data.forms.0',
    label : 'Form',
  }];

  // test page
  const testPage = (props.getModels()[0] || props.page);

  // full width
  const fullWidth = wrapRef.current?.scrollWidth;

  // set actions
  const actions = [
    ...(props.dashup.can(testPage, 'submit') && props.getForms()[0] && props.getForms()[0].get ? [{
      id      : props.getForms()[0].get('_id'),
      icon    : <Icon type="fas" icon="pencil" fixedWidth />,
      label   : props.getForms()[0].get('name'),
      onClick : (item) => {
        setForm(props.getForms()[0].get('_id'));
        props.setItem(item);
      }
    }] : []),

    ...(props.dashup.can(testPage, 'submit') && props.getForms()[0] && props.getForms()[0].get ? [{
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
  // async load methods
  //
  ////////////////////////////////////////////////////////////////////////////////

  // load everything
  const load = async () => {
    // load groups
    setLoading(true);
    
    // load groups
    const groups = await loadGroups();

    // set groups
    setGroups(groups);

    // check groups
    if (groups) {
      // reduce
      const newData = (await Promise.all(groups.map(async (group) => {
        // return value
        return {
          group,
          data : await loadData(group),
        };
      }))).reduce((accum, { group, data }) => {
        // async
        accum[group.value] = data;
      }, {});

      // set data
      setData(newData);
    } else {
      // set data
      setData({
        0 : await loadData(null),
      });
    }
    
    // set loading
    setLoading(false);
  };
  
  // load groups
  const loadGroups = async () => {
    // check groupBy
    if (!props.page.get('data.group')) return;

    // get groupBy field
    const groupBy = getField(props.page.get('data.group'));

    // check groupBy field
    if (!groupBy) return;

    // check if groupBy field has config options
    if (groupBy.options) {
      // return options
      return [...(groupBy.options || [])].map((option) => {
        // check option
        return {
          ...option,

          key : groupBy.name || groupBy.uuid,
        };
      });
    }

    // check if groupBy field is a user field
    if (groupBy.type === 'user') {
      // members
      const members = await eden.router.get(`/app/${props.dashup.get('_id')}/member/query`);

      // return members
      return members.map((member) => {
        // return key
        return {
          key   : groupBy.name || groupBy.uuid,
          label : member.name,
          value : member.id,
        };
      });
    }

    // null
    if (!props.getQuery()) return null;

    // load other groupBy field by unique in db
    const uniqueGroups = await props.getQuery().count(groupBy.name || groupBy.uuid, true);

    // check counts
    if (uniqueGroups && Object.keys(uniqueGroups).length < 20) {
      // return map
      return Object.keys(uniqueGroups).map((key) => {
        // return key
        return {
          key   : groupBy.name || groupBy.uuid,
          label : key,
          value : key,
        };
      });
    }

    // return nothing
    return null;
  };

  // load data
  const loadData = async (group) => {
    // get query
    const getQuery = () => {
      // return where
      return group ? props.getQuery().where({
        [group.key] : group.value,
      }) : props.getQuery();
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
      items : await getQuery().skip(skip).limit(props.page.get('data.limit') || 25).listen(),
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
    if (props.page.get('data.sort.field') === sort?.field && !sort.sort) {
      // sort
      if (props.page.get('data.sort.way') === 1) {
        sort.sort = 'desc';
      }
    }

    // check sort
    if (sort?.field && !sort.sort) sort.sort = 'asc';

    // check sort
    if (props.page.get('data.sort.field') === sort?.field && props.page.get('data.sort.way') === -1) {
      field = null;
    }

    // sort
    props.setData('sort', field ? {
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

  // set tag
  const setTag = async (field, value) => {
    // set tag
    let tags = (props.page.get('user.filter.tags') || []).filter((t) => typeof t === 'object');

    // check tag
    if (tags.find((t) => t.field === field.uuid && t.value === (value?.value || value))) {
      // exists
      tags = tags.filter((t) => t.field !== field.uuid || t.value !== (value?.value || value));
    } else {
      // push tag
      tags.push({
        field : field.uuid,
        value : (value?.value || value),
      });
    }

    // set data
    await props.setUser('filter.tags', tags);
  };

  // set search
  const setSearch = (search = '') => {
    // set page data
    props.setUser('search', search);
  };

  // set columns
  const setColumns = async (columns, force = false) => {
    // force
    if (force) return props.setData('columns', columns);

    // set page data
    debounce(() => props.setData('columns', columns), 200);
  };

  // set filter
  const setFilter = async (filter) => {
    // set data
    props.setUser('query', filter, true);
  };

  // add column
  const addColumn = (data, force = false) => {
    // coplumns
    const columns = props.page.get('data.columns') || [];

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
    const columns = (props.page.get('data.columns') || []).filter((c) => c.id !== id);
    
    // update columns
    setDisableSort(true);
    setColumns(columns, force);

    // timeout
    setTimeout(() => setDisableSort(false), 500);
  };

  // update column
  const setColumn = (id, updates) => {
    // find column
    const column = (props.page.get('data.columns') || []).find((c) => c.id === id);

    // set updates
    Object.keys(updates).forEach((key) => column[key] = updates[key]);
    
    // update columns
    setColumns(props.page.get('data.columns'));
  };

  // order column
  const orderColumn = (id, oldIndex, newIndex) => {
    // find column
    const column = (props.page.get('data.columns') || []).find((c) => c.id === id);
    const columns = (props.page.get('data.columns') || []).filter((c) => c.id !== id);

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
    const field = props.page.get('data.sort.field') && getField(props.page.get('data.sort.field'));

    // field
    return (field && (props.page.get('data.columns') || []).find((c) => c.field === field.uuid)) ? [{
      sort  : props.page.get('data.sort.sort') === 1 ? 'asc' : 'desc',
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

  // get item
  const getField = (field) => {
    // get groupBy field
    return props.getFields().find((f) => f.uuid === field || f.name === field);
  };

  // get columns
  const getColumns = (key) => {
    // return values
    return [...((props.page.get('data.columns') || []).map((col) => {
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

    // add listener
    props.page.on('reload', onUpdate);
    props.page.on('data.sort', onUpdate);
    props.page.on('data.group', onUpdate);
    props.page.on('data.model', onUpdate);
    props.page.on('data.limit', onUpdate);
    props.page.on('user.query', onUpdate);
    props.page.on('data.forms', onUpdate);
    props.page.on('data.filter', onUpdate);
    props.page.on('user.search', onUpdate);
    props.page.on('user.filter.me', onUpdate);
    props.page.on('user.filter.tags', onUpdate);

    // return fn
    return () => {
      // add listener
      props.page.removeListener('reload', onUpdate);
      props.page.removeListener('data.sort', onUpdate);
      props.page.removeListener('data.group', onUpdate);
      props.page.removeListener('data.model', onUpdate);
      props.page.removeListener('data.limit', onUpdate);
      props.page.removeListener('user.query', onUpdate);
      props.page.removeListener('data.forms', onUpdate);
      props.page.removeListener('data.filter', onUpdate);
      props.page.removeListener('user.search', onUpdate);
      props.page.removeListener('user.filter.me', onUpdate);
      props.page.removeListener('user.filter.tags', onUpdate);
    };
  }, [
    skip,
    updated,
    props.page.get('_id'),
    props.page.get('type'),
    props.page.get('data.sort'),
    props.page.get('data.group'),
    props.page.get('data.model'),
    props.page.get('data.limit'),
    props.page.get('user.query'),
    props.page.get('data.forms'),
    props.page.get('data.filter'),
    props.page.get('user.search'),
    props.page.get('user.filter.me'),
    props.page.get('user.filter.tags'),
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
        <MenuItem onClick={ (e) => setUpdating(props.page.get('data.columns').find((c) => c.id === currentColumn.id)) }>
          <ListItemIcon>
            <Icon type="fas" icon="pencil" />
          </ListItemIcon>
          <ListItemText>
            Update Column
          </ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={ (e) => setRemoving(props.page.get('data.columns').find((c) => c.id === currentColumn.id)) } sx={ {
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
    <Page { ...props } require={ required } onConfig={ () => setConfig(true) } onShare={ () => setShare(true) }>

      <Page.Share show={ share } onHide={ (e) => setShare(false) } />
      { !!props.item && <Page.Item show item={ props.item } form={ form } setItem={ props.setItem } onHide={ (e) => props.setItem(null) } /> }
      <Page.Config show={ config } onHide={ (e) => setConfig(false) } />
      
      <Page.Filter onSearch={ setSearch } onSort={ (s) => onSort([s]) } onTag={ setTag } onFilter={ setFilter } isString>
        <Tooltip title="Add Column">
          <IconButton onClick={ (e) => setColumnMenu(e.target) }>
            <Icon type="fas" icon="columns" />
          </IconButton>
        </Tooltip>

        { props.dashup.can(props.page, 'submit') && !!props.getForms().length && (
          <Tooltip title="Add Item">
            <Button
              sx={ {
                ml : 2,
              } }
              variant="contained"
              onClick={ (e) => props.setItem(new props.dashup.Model({}, props.dashup)) }
              startIcon={ (
                props.getForms()[0] && <Icon icon={ props.getForms()[0].get('icon') } />
              ) }
            >
              { props.getForms()[0].get('name') }
            </Button>
          </Tooltip>
        ) }
      </Page.Filter>

      { /* ACTUAL GRID */ }
      { !required.find((r) => !props.page.get(r.key)) && (
        <Page.Body>
          { Object.keys(data).map((key) => {
            // return jsx
            return (
              <Box key={ `group-${key}` } flex={ 1 } ref={ wrapRef }>
                <DataGrid
                  pagination
                  checkboxSelection

                  rows={ getRows(data[key]) }
                  columns={ getColumns(key) }
                  loading={ loading }
                  pageSize={ props.page.get('data.limit') || 25 }
                  rowCount={ data[key].total || 0 }
                  sortModel={ getSort() }
                  onPageChange={ (newPage) => setSkip((props.page.get('data.limit') || 25) * newPage) }
                  paginationMode="server"
                  onColumnResize={ ({ colDef }) => debounce(() => setColumn(colDef.id, { width : colDef.width })) }
                  onColumnOrderChange={ ({ colDef, oldIndex, targetIndex }) => orderColumn(colDef.id, oldIndex, targetIndex) }
                  onPageSizeChange={ (newPageSize) => props.setData('limit', newPageSize) }
                  onSortModelChange={ (model) => onSort(model) }
                  rowsPerPageOptions={ [25, 50, 75, 100] }

                  components={ {
                    ColumnMenu : ColumnMenuComponent,
                  } }
                />
              </Box>
            );
          }) }
        </Page.Body>
      ) }
      { /* / ACTUAL GRID */ }

      { updateJsx }
      { removeJsx }
      { removeItemJsx }

      <Menu
        open={ !!columnMenu }
        onClose={ () => setColumnMenu(null) }
        anchorEl={ columnMenu }
      >
        { (props.getFields() || []).map((field, i) => {
          // get field struct
          const struct = field.type && props.getFieldStruct(field.type);

          // return jsx
          return (
            <MenuItem key={ `column-${field.uuid}` } onClick={ (e) => addColumn({
              field : field.uuid,
              title : field.label || field.name,
            }) }>
              { (struct && struct.icon) && (
                <ListItemIcon>
                  <Icon type="fas" icon={ struct.icon } />
                </ListItemIcon>
              ) }
              <ListItemText>
                { field.label }
              </ListItemText>
            </MenuItem>
          );
        }) }

        <Divider />

        <MenuItem onClick={ (e) => addColumn({
          sort  : 'created_at',
          view  : '{{date _meta.created_at}}',
          field : 'custom',
          title : 'Created At',
        }) }>
          <ListItemIcon>
            <Icon type="fas" icon="calendar-day" />
          </ListItemIcon>
          <ListItemText>
            Created At
          </ListItemText>
        </MenuItem>
        <MenuItem onClick={ (e) => addColumn({
          sort  : 'updated_at',
          view  : '{{date _meta.updated_at}}',
          field : 'custom',
          title : 'Updated At',
        }) }>
          <ListItemIcon>
            <Icon type="fas" icon="calendar-alt" />
          </ListItemIcon>
          <ListItemText>
            Updated At
          </ListItemText>
        </MenuItem>
        <MenuItem onClick={ (e) => addColumn({
          view  : '',
          field : 'custom',
          title : 'Custom Column',
        }) }>
          <ListItemIcon>
            <Icon type="fas" icon="function" />
          </ListItemIcon>
          <ListItemText>
            Custom
          </ListItemText>
        </MenuItem>
      </Menu>
    </Page>
  );
};

// export default model page
export default PageGrid;