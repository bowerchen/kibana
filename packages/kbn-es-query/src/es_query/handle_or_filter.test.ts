/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fields } from '../filters/stubs';
import { DataViewBase } from './types';
import { handleOrFilter } from './handle_or_filter';
import {
  buildExistsFilter,
  buildOrFilter,
  buildPhraseFilter,
  buildPhrasesFilter,
  buildRangeFilter,
} from '../filters';

describe('#handleOrFilter', function () {
  const indexPattern: DataViewBase = {
    id: 'logstash-*',
    fields,
    title: 'dataView',
  };

  const getField = (fieldName: string) => {
    const field = fields.find(({ name }) => fieldName === name);
    if (!field) throw new Error(`field ${name} does not exist`);
    return field;
  };

  it('Handles an empty list of filters', () => {
    const filter = buildOrFilter([]);
    const result = handleOrFilter(filter);
    expect(result.query).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "minimum_should_match": 1,
          "should": Array [],
        },
      }
    `);
  });

  it('Handles a simple list of filters', () => {
    const filters = [
      buildPhraseFilter(getField('extension'), 'value', indexPattern),
      buildRangeFilter(getField('bytes'), { gte: 10 }, indexPattern),
      buildExistsFilter(getField('machine.os'), indexPattern),
    ];
    const filter = buildOrFilter(filters);
    const result = handleOrFilter(filter);
    expect(result.query).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "minimum_should_match": 1,
          "should": Array [
            Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "match_phrase": Object {
                      "extension": "value",
                    },
                  },
                ],
                "must": Array [],
                "must_not": Array [],
                "should": Array [],
              },
            },
            Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "range": Object {
                      "bytes": Object {
                        "gte": 10,
                      },
                    },
                  },
                ],
                "must": Array [],
                "must_not": Array [],
                "should": Array [],
              },
            },
            Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "exists": Object {
                      "field": "machine.os",
                    },
                  },
                ],
                "must": Array [],
                "must_not": Array [],
                "should": Array [],
              },
            },
          ],
        },
      }
    `);
  });

  it('Handles a combination of filters and filter arrays', () => {
    const filters = [
      buildPhraseFilter(getField('extension'), 'value', indexPattern),
      [
        buildRangeFilter(getField('bytes'), { gte: 10 }, indexPattern),
        buildExistsFilter(getField('machine.os'), indexPattern),
      ],
    ];
    const filter = buildOrFilter(filters);
    const result = handleOrFilter(filter);
    expect(result.query).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "minimum_should_match": 1,
          "should": Array [
            Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "match_phrase": Object {
                      "extension": "value",
                    },
                  },
                ],
                "must": Array [],
                "must_not": Array [],
                "should": Array [],
              },
            },
            Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "range": Object {
                      "bytes": Object {
                        "gte": 10,
                      },
                    },
                  },
                  Object {
                    "exists": Object {
                      "field": "machine.os",
                    },
                  },
                ],
                "must": Array [],
                "must_not": Array [],
                "should": Array [],
              },
            },
          ],
        },
      }
    `);
  });

  it('Handles nested OR filters', () => {
    const nestedOrFilter = buildOrFilter([
      buildPhraseFilter(getField('machine.os'), 'value', indexPattern),
      buildPhraseFilter(getField('extension'), 'value', indexPattern),
    ]);
    const filters = [
      buildPhraseFilter(getField('extension'), 'value2', indexPattern),
      nestedOrFilter,
      buildRangeFilter(getField('bytes'), { gte: 10 }, indexPattern),
      buildExistsFilter(getField('machine.os.raw'), indexPattern),
    ];
    const filter = buildOrFilter(filters);
    const result = handleOrFilter(filter);
    expect(result.query).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "minimum_should_match": 1,
          "should": Array [
            Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "match_phrase": Object {
                      "extension": "value2",
                    },
                  },
                ],
                "must": Array [],
                "must_not": Array [],
                "should": Array [],
              },
            },
            Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "bool": Object {
                      "minimum_should_match": 1,
                      "should": Array [
                        Object {
                          "bool": Object {
                            "filter": Array [
                              Object {
                                "match_phrase": Object {
                                  "machine.os": "value",
                                },
                              },
                            ],
                            "must": Array [],
                            "must_not": Array [],
                            "should": Array [],
                          },
                        },
                        Object {
                          "bool": Object {
                            "filter": Array [
                              Object {
                                "match_phrase": Object {
                                  "extension": "value",
                                },
                              },
                            ],
                            "must": Array [],
                            "must_not": Array [],
                            "should": Array [],
                          },
                        },
                      ],
                    },
                  },
                ],
                "must": Array [],
                "must_not": Array [],
                "should": Array [],
              },
            },
            Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "range": Object {
                      "bytes": Object {
                        "gte": 10,
                      },
                    },
                  },
                ],
                "must": Array [],
                "must_not": Array [],
                "should": Array [],
              },
            },
            Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "exists": Object {
                      "field": "machine.os.raw",
                    },
                  },
                ],
                "must": Array [],
                "must_not": Array [],
                "should": Array [],
              },
            },
          ],
        },
      }
    `);
  });

  it('Handles negated sub-filters', () => {
    const negatedFilter = buildPhrasesFilter(getField('extension'), ['tar', 'gz'], indexPattern);
    negatedFilter.meta.negate = true;

    const filters = [
      [negatedFilter, buildPhraseFilter(getField('extension'), 'value', indexPattern)],
      buildRangeFilter(getField('bytes'), { gte: 10 }, indexPattern),
      buildExistsFilter(getField('machine.os'), indexPattern),
    ];
    const filter = buildOrFilter(filters);
    const result = handleOrFilter(filter);
    expect(result.query).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "minimum_should_match": 1,
          "should": Array [
            Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "match_phrase": Object {
                      "extension": "value",
                    },
                  },
                ],
                "must": Array [],
                "must_not": Array [
                  Object {
                    "bool": Object {
                      "minimum_should_match": 1,
                      "should": Array [
                        Object {
                          "match_phrase": Object {
                            "extension": "tar",
                          },
                        },
                        Object {
                          "match_phrase": Object {
                            "extension": "gz",
                          },
                        },
                      ],
                    },
                  },
                ],
                "should": Array [],
              },
            },
            Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "range": Object {
                      "bytes": Object {
                        "gte": 10,
                      },
                    },
                  },
                ],
                "must": Array [],
                "must_not": Array [],
                "should": Array [],
              },
            },
            Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "exists": Object {
                      "field": "machine.os",
                    },
                  },
                ],
                "must": Array [],
                "must_not": Array [],
                "should": Array [],
              },
            },
          ],
        },
      }
    `);
  });

  it('Handles disabled filters within a filter array', () => {
    const disabledFilter = buildPhraseFilter(getField('ssl'), false, indexPattern);
    disabledFilter.meta.disabled = true;
    const filters = [
      buildPhraseFilter(getField('extension'), 'value', indexPattern),
      [disabledFilter, buildRangeFilter(getField('bytes'), { gte: 10 }, indexPattern)],
      buildExistsFilter(getField('machine.os'), indexPattern),
    ];
    const filter = buildOrFilter(filters);
    const result = handleOrFilter(filter);
    expect(result.query).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "minimum_should_match": 1,
          "should": Array [
            Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "match_phrase": Object {
                      "extension": "value",
                    },
                  },
                ],
                "must": Array [],
                "must_not": Array [],
                "should": Array [],
              },
            },
            Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "range": Object {
                      "bytes": Object {
                        "gte": 10,
                      },
                    },
                  },
                ],
                "must": Array [],
                "must_not": Array [],
                "should": Array [],
              },
            },
            Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "exists": Object {
                      "field": "machine.os",
                    },
                  },
                ],
                "must": Array [],
                "must_not": Array [],
                "should": Array [],
              },
            },
          ],
        },
      }
    `);
  });

  it('Handles complex-nested filters with ANDs and ORs', () => {
    const filters = [
      [
        buildPhrasesFilter(getField('extension'), ['tar', 'gz'], indexPattern),
        buildPhraseFilter(getField('ssl'), false, indexPattern),
        buildOrFilter([
          buildPhraseFilter(getField('extension'), 'value', indexPattern),
          buildRangeFilter(getField('bytes'), { gte: 10 }, indexPattern),
        ]),
        buildExistsFilter(getField('machine.os'), indexPattern),
      ],
      buildPhrasesFilter(getField('machine.os.keyword'), ['foo', 'bar'], indexPattern),
    ];
    const filter = buildOrFilter(filters);
    const result = handleOrFilter(filter);
    expect(result.query).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "minimum_should_match": 1,
          "should": Array [
            Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "bool": Object {
                      "minimum_should_match": 1,
                      "should": Array [
                        Object {
                          "match_phrase": Object {
                            "extension": "tar",
                          },
                        },
                        Object {
                          "match_phrase": Object {
                            "extension": "gz",
                          },
                        },
                      ],
                    },
                  },
                  Object {
                    "match_phrase": Object {
                      "ssl": false,
                    },
                  },
                  Object {
                    "bool": Object {
                      "minimum_should_match": 1,
                      "should": Array [
                        Object {
                          "bool": Object {
                            "filter": Array [
                              Object {
                                "match_phrase": Object {
                                  "extension": "value",
                                },
                              },
                            ],
                            "must": Array [],
                            "must_not": Array [],
                            "should": Array [],
                          },
                        },
                        Object {
                          "bool": Object {
                            "filter": Array [
                              Object {
                                "range": Object {
                                  "bytes": Object {
                                    "gte": 10,
                                  },
                                },
                              },
                            ],
                            "must": Array [],
                            "must_not": Array [],
                            "should": Array [],
                          },
                        },
                      ],
                    },
                  },
                  Object {
                    "exists": Object {
                      "field": "machine.os",
                    },
                  },
                ],
                "must": Array [],
                "must_not": Array [],
                "should": Array [],
              },
            },
            Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "bool": Object {
                      "minimum_should_match": 1,
                      "should": Array [
                        Object {
                          "match_phrase": Object {
                            "machine.os.keyword": "foo",
                          },
                        },
                        Object {
                          "match_phrase": Object {
                            "machine.os.keyword": "bar",
                          },
                        },
                      ],
                    },
                  },
                ],
                "must": Array [],
                "must_not": Array [],
                "should": Array [],
              },
            },
          ],
        },
      }
    `);
  });

  it('Preserves filter properties', () => {
    const filters = [
      buildPhraseFilter(getField('extension'), 'value', indexPattern),
      buildRangeFilter(getField('bytes'), { gte: 10 }, indexPattern),
      buildExistsFilter(getField('machine.os'), indexPattern),
    ];
    const filter = buildOrFilter(filters);
    const { query, ...rest } = handleOrFilter(filter);
    expect(rest).toMatchInlineSnapshot(`
      Object {
        "$state": Object {
          "store": "appState",
        },
        "meta": Object {
          "alias": null,
          "disabled": false,
          "index": undefined,
          "negate": false,
          "params": Array [
            Object {
              "meta": Object {
                "index": "logstash-*",
              },
              "query": Object {
                "match_phrase": Object {
                  "extension": "value",
                },
              },
            },
            Object {
              "meta": Object {
                "field": "bytes",
                "index": "logstash-*",
                "params": Object {},
              },
              "query": Object {
                "range": Object {
                  "bytes": Object {
                    "gte": 10,
                  },
                },
              },
            },
            Object {
              "meta": Object {
                "index": "logstash-*",
              },
              "query": Object {
                "exists": Object {
                  "field": "machine.os",
                },
              },
            },
          ],
          "type": "OR",
        },
      }
    `);
  });
});
