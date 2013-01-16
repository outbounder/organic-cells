var organic = require("organic");
describe("Self", function(){
  var Self = require("../../plasma/Self");
  var plasma = new organic.Plasma();

  it("creates instance", function(next) {
    instance = new Self(plasma, {});
    expect(instance instanceof Self).toBe(true);
    next();
  });

  it("restarts", function(next){
    plasma.once("Tissue", function(c, sender, callback){
      expect(sender instanceof Self).toBe(true);
      expect(c.target).toBe(process.argv[1]); // self
      callback({data: {pid: "fake"}});
    });
    plasma.emit({
      type: "Self",
      action: "restart"
    }, this, function(c){
      expect(c instanceof Error).toBe(false);
      expect(c.data.pid).toBe("fake");
      next();
      return false; // do not exit the process
    })
  })

  it("upgrades", function(next){
    plasma.once("Tissue", function(c, sender, callback){
      expect(sender instanceof Self).toBe(true);
      expect(c.exec).toBe("git pull; npm install");

      plasma.once("Tissue", function(c, sender, callback){
        expect(sender instanceof Self).toBe(true);
        expect(c.target).toBe(process.argv[1]); // self
        callback({data: {pid: "fake"}});
      });

      callback({data: {pid: "fake"}});
    });
    plasma.emit({
      type: "Self",
      action: "upgrade"
    }, this, function(c){
      expect(c instanceof Error).toBe(false);
      expect(c.data.pid).toBe("fake");
      next();
      return false; // do not exit the process
    })
  });


});