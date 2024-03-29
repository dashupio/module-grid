
// import page interface
import { Struct } from '@dashup/module';

/**
 * build address helper
 */
export default class GridPage extends Struct {

  /**
   * returns page type
   */
  get type() {
    // return page type label
    return 'grid';
  }

  /**
   * returns page type
   */
  get icon() {
    // return page type label
    return 'fad fa-align-justify text-info';
  }

  /**
   * returns page type
   */
  get title() {
    // return page type label
    return 'Grid';
  }

  /**
   * returns page data
   */
  get data() {
    // return page data
    return {};
  }

  /**
   * returns object of views
   */
  get views() {
    // return object of views
    return {
      view   : 'page/grid',
      config : 'page/grid/config',
    };
  }

  /**
   * returns category list for page
   */
  get categories() {
    // return array of categories
    return ['View'];
  }

  /**
   * returns page descripton for list
   */
  get description() {
    // return description string
    return 'Filterable Customizable Grid view';
  }
}