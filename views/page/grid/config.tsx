
// import react
import React from 'react';
import { Box, Query, Divider, TextField, MenuItem } from '@dashup/ui';

// create page model config
const PageGridConfig = (props = {}) => {

  // get dashboards
  const getModels = () => {
    // get forms
    const models = Array.from(props.dashup.get('pages').values()).filter((page) => {
      // return model pages
      return page.get('type') === 'model' && !page.get('archived');
    });

    // return mapped
    return models.map((model) => {
      // return values
      return {
        value : model.get('_id'),
        label : model.get('name'),

        selected : (props.page.get('data.model') || []).includes(model.get('_id')),
      };
    });
  };

  // get forms
  const getForms = () => {
    // get forms
    const forms = Array.from(props.dashup.get('pages').values()).filter((page) => {
      // return model pages
      return page.get('type') === 'form' && page.get('data.model') === props.page.get('data.model') && !page.get('archived');
    });

    // return mapped
    return forms.map((form) => {
      // return values
      return {
        value : form.get('_id'),
        label : form.get('name'),

        selected : (props.page.get('data.forms') || []).includes(form.get('_id')),
      };
    });
  };
  
  // get field
  const getField = (tld, types = []) => {
    // return value
    return props.getFields().map((field) => {
      // check type
      if (types.length && !types.includes(field.type)) return;

      // return fields
      return {
        label : field.label || field.name,
        value : field.uuid,

        selected : (props.page.get(`data.${tld}`) || []).includes(field.uuid),
      };
    }).filter((f) => f);
  };

  // return jsx
  return (
    <>
      <TextField
        label="Choose Model"
        value={ props.page.get('data.model') || '' }
        select
        onChange={ (e) => props.setData('model', e.target.value) }
        fullWidth
        helperText="The model this grid will display."
      >
        { getModels().map((option) => (
          <MenuItem key={ option.value } value={ option.value }>
            { option.label }
          </MenuItem>
        ))}
      </TextField>

      { !!props.page.get('data.model') && (
        <TextField
          label="Choose Form(s)"
          value={ Array.isArray(props.page.get('data.forms')) ? props.page.get('data.forms') : [props.page.get('data.forms')].filter((v) => v) }
          select
          onChange={ (e) => props.setData('forms', e.target.value) }
          fullWidth
          helperText="The forms that this grid will filter by."
          SelectProps={ {
            multiple : true,
          } }
        >
          { getForms().map((option) => (
            <MenuItem key={ option.value } value={ option.value }>
              { option.label }
            </MenuItem>
          ))}
        </TextField>
      ) }

      { !!props.page.get('data.model') && props.getFields && !!props.getFields().length && (
        <>
          <Box my={ 2 }>
            <Divider />
          </Box>

          <TextField
            label="Group Field"
            value={ props.page.get('data.group') || '' }
            select
            onChange={ (e) => props.setData('group', e.target.value) }
            fullWidth
            helperText="Selecting a tag field will group the grid by this field."
          >
            { getField('tag', ['select', 'checkbox']).map((option) => (
              <MenuItem key={ option.value } value={ option.value }>
                { option.label }
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Tag Field(s)"
            value={ Array.isArray(props.page.get('data.tag')) ? props.page.get('data.tag') : [props.page.get('data.tag')].filter((v) => v) }
            select
            onChange={ (e) => props.setData('tag', e.target.value) }
            fullWidth
            helperText="Selecting a tag field will allow you to tag rows."
            SelectProps={ {
              multiple : true,
            } }
          >
            { getField('tag', ['select', 'checkbox']).map((option) => (
              <MenuItem key={ option.value } value={ option.value }>
                { option.label }
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="User Field(s)"
            value={ Array.isArray(props.page.get('data.user')) ? props.page.get('data.user') : [props.page.get('data.user')].filter((v) => v) }
            select
            onChange={ (e) => props.setData('user', e.target.value) }
            fullWidth
            helperText="Selecting a tag field will allow you to tag rows."
            SelectProps={ {
              multiple : true,
            } }
          >
            { getField('user', ['user']).map((option) => (
              <MenuItem key={ option.value } value={ option.value }>
                { option.label }
              </MenuItem>
            ))}
          </TextField>

          <Box my={ 2 }>
            <Divider />
          </Box>
            
          <Query
            isString

            page={ props.page }
            label="Filter By"
            query={ props.page.get('data.filter') }
            dashup={ props.dashup }
            fields={ props.getFields() }
            onChange={ (val) => props.setData('filter', val) }
            getFieldStruct={ props.getFieldStruct }
          />
        </>
      ) }
    </>
  )
};

// export default
export default PageGridConfig;