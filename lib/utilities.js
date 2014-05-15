var _ = require('underscore');


function commaSeparatedItems(items) {
  if (items.length == 0) {
    return '';
  } else if (items.length == 1) {
    return items[0];
  } else if (items.length == 2) {
    return items[0] + ' and ' + items[1];
  } else {
    text = '';
    for (var i = 0; i < items.length - 1; i++) {
      text += items[i] + ', ';
    }
    return text + 'and ' + items[items.length - 1];
  }
}

module.exports = {
  commaSeparatedItems: commaSeparatedItems
};
