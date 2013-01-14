var fs = require('fs');

describe("Tissue", function(){
  var Tissue = require("../../membrane/Tissue");
  var Plasma = require("organic").Plasma;
  var tissue;
  var childCell;
  var plasma = new Plasma();
  var config = {}
  it("creates instance", function(){
    tissue = new Tissue(plasma, config);
  });

  it("spawns new cell from path", function(next){
    plasma.emit({type: "Tissue", action: "start", target: __dirname+"/../data/cell.js"}, this, function(c){
      expect(c instanceof Error).toBe(false);
      childCell = c.data;
      expect(fs.existsSync("cell.js.out")).toBe(true);
      expect(fs.existsSync("cell.js.err")).toBe(true);
      next();
    });
  });

  it("kills the new cell", function(next){
    setTimeout(function(){
      plasma.emit({type: "Tissue", action: "stop", target: childCell.pid}, this, function(c){
        expect(c instanceof Error).toBe(false);
        fs.unlink("cell.js.out");
        fs.unlink("cell.js.err");
        next();
      });  
    }, 2000);
  });
});