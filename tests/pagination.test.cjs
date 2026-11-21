const assert = require("node:assert/strict");
const test = require("node:test");
const pagination = require("../assets/js/pagination.js");

test("uses source and external id as a stable application identity", () => {
  assert.equal(pagination.key({source:"fdroid",external_id:"org.example.app"}),"fdroid:org.example.app");
});

test("appends new pages without duplicating records across page boundaries", () => {
  const first = [
    {source:"fdroid",external_id:"one",name:"One"},
    {source:"fdroid",external_id:"two",name:"Two"}
  ];
  const second = [
    {source:"fdroid",external_id:"two",name:"Two duplicate"},
    {source:"winget",external_id:"two",name:"Different source"},
    {source:"fdroid",external_id:"three",name:"Three"}
  ];
  const merged = pagination.mergeUnique(first,second);
  assert.deepEqual(merged.map(item=>item.name),["One","Two","Different source","Three"]);
  assert.equal(merged.length,4);
});

test("supports records without source keys by falling back to id", () => {
  const merged = pagination.mergeUnique([{id:42,name:"Existing"}],[{id:42,name:"Duplicate"},{id:43,name:"New"}]);
  assert.deepEqual(merged.map(item=>item.id),[42,43]);
});

test("stops when the loaded offset reaches the server total", () => {
  assert.equal(pagination.hasMore(0,25,12),true);
  assert.equal(pagination.hasMore(12,25,12),true);
  assert.equal(pagination.hasMore(24,25,12),true);
  assert.equal(pagination.hasMore(25,25,12),false);
  assert.equal(pagination.hasMore(0,0,0),false);
});
