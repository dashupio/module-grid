
// import page interface
import { Struct } from '@dashup/module';

/**
 * build address helper
 */
export default class GridBlock extends Struct {

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
    return 'fad fa-bars';
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
      view   : 'block/grid',
      config : 'block/grid/config',
    };
  }

  /**
   * returns category list for page
   */
  get categories() {
    // return array of categories
    return ['phone', 'dashboard'];
  }

  /**
   * returns page descripton for list
   */
  get description() {
    // return description string
    return 'Customizable Grid Block';
  }
}