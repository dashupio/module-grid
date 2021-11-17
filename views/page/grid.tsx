
// import dependencies
import { Box, DataGrid } from '@dashup/ui';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Icon, Button, Menu, MenuItem, Page, View, CircularProgress, GridActionsCellItem } from '@dashup/ui';

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
  // groups
  const [open, setOpen] = useState(false);
  const [skip, setSkip] = useState(0);
  const [form, setForm] = useState(null);
  const [share, setShare] = useState(false);
  const [config, setConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState(new Date());
  const [selected, setSelected] = useState({ type : 'items', items : [] });

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
    props.setUser('search', search.length ? search : null);
  };

  // set columns
  const setColumns = async (columns) => {
    // set page data
    props.setData('columns', columns);
  };

  // set filter
  const setFilter = async (filter) => {
    // set data
    props.setUser('query', filter, true);
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
    // get field
    const field = props.page.get('data.sort.field') && getField(props.page.get('data.sort.field'));

    // field
    return field && (props.page.get('data.columns') || []).find((c) => c.field === field.uuid) ? [{
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
        field      : field?.name || field?.uuid || col.field,
        width      : col.width || (col.basis && fullWidth ? ((fullWidth - 200) * (col.basis / 100)) : null),
        editable   : true,
        resizable  : true,
        headerName : col.title,
      };
    })),
    {
      id         : 'actions',
      type       : 'actions',
      field      : 'actions',
      width      : 100,
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
      setUpdated(new Date());
    };

    // load groups
    load();

    // add listener
    props.page.on('reload', onUpdate);

    // return fn
    return () => {
      // remove listener
      props.page.removeListener('reload', onUpdate);
    };
  }, [
    skip,
    props.page.get('_id'),
    props.page.get('type'),
    props.page.get('data.sort'),
    props.page.get('data.group'),
    props.page.get('data.limit'),
    props.page.get('user.query'),
    props.page.get('data.filter'),
    props.page.get('user.search'),
    props.page.get('user.filter.me'),
    props.page.get('user.filter.tags'),
  ]);

  // return jsx
  return (
    <Page { ...props } require={ required } bodyClass="flex-column">

      <Page.Share show={ share } onHide={ (e) => setShare(false) } />
      { !!props.item && <Page.Item show item={ props.item } form={ form } setItem={ props.setItem } onHide={ (e) => props.setItem(null) } /> }
      <Page.Config show={ config } onHide={ (e) => setConfig(false) } />

      <Page.Menu onConfig={ () => setConfig(true) } presence={ props.presence } onShare={ () => setShare(true) }>
        <>
          { props.dashup.can(props.page, 'submit') && !!props.getForms().length && (
            props.getForms().length > 1 ? (
              <>
                <Button
                  variant="contained"
                  onClick={ (e) => setOpen(open ? false : e.target) }
                >
                  Create
                </Button>
                <Menu
                  open={ !!open }
                  onClose={ () => setOpen(false) }
                  anchorEl={ open }
                  anchorOrigin={ {
                    vertical   : 'bottom',
                    horizontal : 'right',
                  } }
                  transformOrigin={ {
                    vertical   : 'top',
                    horizontal : 'right',
                  } }
                >
                  { props.getForms().map((form) => {
                      // return jsx
                      return (
                        <MenuItem key={ `create-${form.get('_id')}` } onClick={ (e) => !setForm(form.get('_id')) && props.setItem(new props.dashup.Model({}, props.dashup)) }>
                          { form.get('name') }
                        </MenuItem>
                      );
                    })
                  }
                </Menu>
              </>
            ) : (
              <Button
                variant="contained"
                onClick={ (e) => !setForm(props.getForms()[0].get('_id')) && props.setItem(new props.dashup.Model({}, props.dashup)) }
              >
                { props.getForms()[0].get('name') }
              </Button>
            )
          ) }
        </>
      </Page.Menu>
      <Page.Filter onSearch={ setSearch } onSort={ (s) => onSort([s]) } onTag={ setTag } onFilter={ setFilter } isString />
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
                  onPageSizeChange={ (newPageSize) => props.setData('limit', newPageSize) }
                  onSortModelChange={ (model) => onSort(model) }
                  rowsPerPageOptions={ [25, 50, 75, 100] }
                />
              </Box>
            );
          }) }
        </Page.Body>
      ) }
    </Page>
  );
};

// export default model page
export default PageGrid;