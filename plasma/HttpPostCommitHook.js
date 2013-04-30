var Organel = require("organic").Organel;

/* organel | HttpPostCommitHook

Organelle responsible for emitting Self chemical with `action` for self-upgrade. The organelle mounts route handler on express app instance via HttpServer chemical.

* `postCommitUrl` : "/post-commit"

  The url route to be mounted on express app.

* `triggerChemical` : Self Chemical

  *optional*, defaults to:
    
      { type: "Self", action: "upgrade" }

* `triggerOn` : String

  *optional*, if provided emitting triggerChemical will happen only if send data contains `triggerOn` value.*/

/* incoming | HttpServer 

Once organelle receives HttpServer chemical it will try to mount route handler for triggering any configured chemicals.

* data : ExpressHttpServer instance

  * app : express app*/
/* incoming | HttpPostCommitHook 

* `action` : String

  `action` can have value only equal to `processPostCommit` , which will instruct the organelle to process the given chemical for triggering emit of any configured actions.

  expected chemical contents further more depending on the configuration are as follows:

* `req` : Object

  plan object or express request object
  
  * `ref` : String

    reference which could be scanned for existence of `triggerOn` value*/
/* outgoing | Self 

* `action` : "upgrade"*/

module.exports = Organel.extend(function HttpPostCommitHook(plasma, config){
  Organel.call(this, plasma, config);
  
  this.config = config || {};
  this.config.postCommitUrl = this.config.postCommitUrl || "/post-commit";
  this.config.traggerChemical = this.config.traggerChemical || {type: "Self", action: "upgrade"};
  
  var self = this;
  this.on("HttpPostCommitHook", function(c, sender, callback){
    this[c.action](c, sender, callback);
  });

  this.on("HttpServer", function(c){
    if(this.config.log)
      console.log("post-commit-hook", this.config.postCommitUrl);

    c.data.app.post(this.config.postCommitUrl, function(req, res, next){
      if(req.body) {
        self.processPostCommit({req: req.body}, self);
        res.send({success: true});
      } else {
        var buffer = "";
        req.on('data', function(data){
          buffer += data.toString();
        })
        req.on('end', function(){
          req.body = buffer;
          self.processPostCommit({req: req.body}, self);
          res.send({success: true});
        })
      }
    });
    
    return false;
  })
}, {
  "processPostCommit": function(c, sender, callback) {
    if(this.config.triggerOn) {
      if(c.req.payload) {
        try {
          c.req = JSON.parse(c.req.payload)
        } catch(e){ }
      }
      if(c.req.ref && c.req.ref.indexOf(this.config.triggerOn) !== -1)
        this.emit(this.config.traggerChemical, callback);
    } else
      this.emit({type: "Self", action: "upgrade"}, callback);
  }
});