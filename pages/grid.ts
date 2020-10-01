
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
    return 'fa fa-database';
  }

  /**
   * returns page type
   */
  get title() {
    // return page type label
    return 'Grid Page';
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
      grid   : 'grid',
      
      view   : 'page/grid/view',
      menu   : 'page/grid/menu',
      config : 'page/grid/config',
    };
  }

  /**
   * returns category list for page
   */
  get categories() {
    // return array of categories
    return ['frontend'];
  }

  /**
   * returns page descripton for list
   */
  get description() {
    // return description string
    return 'Page Descripton';
  }
}