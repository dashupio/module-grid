
// import react
import React from 'react';
import { Box, Divider, Query, TextField, MenuItem } from '@dashup/ui';

// block list
const BlockGridConfig = (props = {}) => {

  // get forms
  const getModels = () => {
    // get forms
    const forms = Array.from(props.dashup.get('pages').values()).filter((page) => {
      // return model pages
      return page.get('type') === 'model' && !page.get('archived');
    });

    // return mapped
    return forms.map((form) => {
      // return values
      return {
        value : form.get('_id'),
        label : form.get('name'),

        selected : (props.model || props.block.model || []).includes(form.get('_id')),
      };
    });
  };

  // get forms
  const getForms = () => {
    // get forms
    const forms = Array.from(props.dashup.get('pages').values()).filter((page) => {
      // return model pages
      return page.get('type') === 'form' && page.get('data.model') === (props.model || props.block.model) && !page.get('archived');
    });

    // return mapped
    return forms.map((form) => {
      // return values
      return {
        value : form.get('_id'),
        label : form.get('name'),

        selected : (props.block.form || []).includes(form.get('_id')),
      };
    });
  };

  // return jsx
  return (
    <>
      <TextField
        label="Choose Model"
        value={ props.block.model || '' }
        select
        onChange={ (e) => props.setBlock(props.block, 'model', e.target.value) }
        fullWidth
        helperText="The model this grid will display."
      >
        { getModels().map((option) => (
          <MenuItem key={ option.value } value={ option.value }>
            { option.label }
          </MenuItem>
        ))}
      </TextField>

      { !!props.block.model && (
        <TextField
          label="Choose Form(s)"
          value={ Array.isArray(props.block.forms) ? props.block.forms : [props.block.forms].filter((v) => v) }
          select
          onChange={ (e) => props.setBlock(props.block, 'forms', e.target.value) }
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

      { !!getModels().filter((f) => f.selected).length && (
        <>
          <Box my={ 2 }>
            <Divider />
          </Box>

          <Query
            isString

            page={ props.page }
            label="Filter By"
            query={ props.block.filter }
            dashup={ props.dashup }
            fields={ props.getFields([props.model]) }
            onChange={ (val) => props.setBlock(props.block, 'filter', val) }
            getFieldStruct={ props.getFieldStruct }
          />
        </>
      ) }
    </>
  );
}

// export default
export default BlockGridConfig;