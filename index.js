// require first
const { Module } = require('@dashup/module');

// import base
const GridPage = require('./pages/grid');
const GridBlock = require('./blocks/grid');

/**
 * export module
 */
class GridModule extends Module {

  /**
   * construct discord module
   */
  constructor() {
    // run super
    super();
  }
  
  /**
   * registers dashup structs
   *
   * @param {*} register 
   */
  register(fn) {
    // register grid page
    fn('page', GridPage);

    // register grid block
    fn('block', GridBlock);
  }
}

// create new
module.exports = new GridModule();
