import _, { isArray } from "lodash";

function mapper(thing: any, prefix: any, paths: any) {
  if (_.isObject(thing)) {
    _.forEach(thing, function (value: any, key: any) {
      mapper(value, prefix + key + ".", paths);
    });
  } else if (_.isArray(thing)) {
    for (var i = 0; i < thing.length; i++)
      //@ts-ignore
      mapper(value, prefix + i + ".", paths);
  } else {
    paths.push(prefix.replace(/\.$/, ""));
  }
}

const getPathHelper = (obj: any, query: any, paths: any) => {
  const reg = new RegExp(query.replace(/\[\]/g, "\\d"));
  mapper(obj, "", paths);

  return _.filter(paths, function (v: any) {
    return reg.test(v);
  });
};

/**
 * @param  {object[]|object} obj
 * @param  {any[]|any} query
 */
export const getPaths = (obj: object[] | object, query: any[] | any) => {
  const results: any[] = [];
  if (!isArray(query)) {
    results.push(...getPathHelper(obj, query, []));
  } else {
    query.forEach((q: any) => {
      results.push(...getPathHelper(obj, q, []));
    });
  }

  return results;
};