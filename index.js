'use strict';

var React = require('react/addons');
var TransitionGroup = React.createFactory(React.addons.TransitionGroup);

var RAFList = require('./RAFList');

var SubContainer = React.createFactory(require('./SubContainer'));

/*
- The properties I can expect:
i) Height and width of every element. (Object with max-width or min-widths, for multiple, undefined === 100%)
   // NOT YET: OR every single data element with its own height and width for Masonry style layouts
   // NOT YET: OR Detect Height automatically after rendering for Masonry

ii) Function to use for rendering actual content withing animated/positioned divs

iii) component:[string] Element name for conatainers. Defaults to div

iv) data: Array of data points (may include size data)

v) Total number of elements to be shown, defaults to Array.length

vi) OPTIONAL: callback for scrolling and loading elements toward the end of the dataset (for loading more via AJAX)

vii) Max number of columns: Defaults to infinite.

viii) Align: defaults to center

ix) Callbacks for breakpoints. Given in an array

x) Transition duration, curve and delay per element (for staggered animations) defaults to 0.5s ease. And 0 stagger.

xi) classname, elementClassName

*/
function layout(direction) {
  var elementWidth = this.props.mobileWidth <= windowWidth ? this.props.elementWidth :
    this.props.elementMobileWidth;
  var elementHeight = this.props.mobileWidth <= windowWidth ? this.props.elementHeight :
    this.props.elementMobileHeight;
  var margin = this.props.margin;

  var windowX, windowY, elementX, elementY;
  if (direction === 'vertical') {
    windowX = this.state.windowWidth;
    windowY = this.state.windowHeight;
    elementX = elementWidth;
    elementY = elementHeight;
  } else {
    windowX = this.state.windowHeight;
    windowY = this.state.windowWidth;
    elementX = elementHeight;
    elementY = elementWidth;
  }

  if(this.props.justifyOnMobile && this.props.mobileWidth > windowWidth) {
    elementX = windowX;
    margin = 0;
  }

  var numElements = Math.max(1, Math.floor((windowX - margin) / (elementX + margin)));
  var extraSpace = windowX - numElements * (elementX + margin) + margin;
  var offset = this.props.align === 'left' ? 0 :
               this.props.align === 'center' ? Math.round(extraSpace/2) : extraSpace;

  var scrollStart = this.state.scrollTop - this.state.scrollDelta;
  var numBefore = Math.floor((scrollStart - margin) / (elementHeight + margin));
  var numVisible = Math.ceil(((numBefore * (elementY + margin)) + windowY)/
    (elementY + margin));

  var extra = numElements === 1 ? Math.ceil(numVisible/2) : 2;
  var lowerLimit = (numBefore - extra) * numElements;
  var higherLimit = (numVisible + extra*2) * numElements;

  var elementsToRender = [];

  this.props.data.forEach(function (obj, index) {
    if(index >= lowerLimit && index < higherLimit) {
      var column, row;
      if (direction === 'vertical') {
        column = index % numElements;
        row = Math.floor(index / numElements);
      } else {
        row = index % numElements;
        column = Math.floor(index / numElements);
      }
      elementsToRender.push(SubContainer(
        {
          key: obj.id || obj._id,
          transform: 'translate('+ (offset + column * (elementWidth + margin))  +'px, '+
            (margin + row * (elementHeight + margin)) +'px)',
          width: elementWidth + 'px',
          height: elementHeight + 'px',
          transition: this.props.transition,
        },
        this.props.childComponent(obj)
      ));
    }
  }.bind(this));

  return React.createElement(this.props.containerComponent,
    {
      className: 'infinite-container', style: {
        height: (margin + (elementHeight + margin) *
          Math.ceil(this.props.data.length / numElements)) + 'px',
        width: '100%',
        position: 'relative',
      },
    },
    TransitionGroup(null, elementsToRender)
  );
}

var Infinite = React.createClass({

  displayName: 'React-Infinity',

  getDefaultProps: function () {
    return {
      data: [],
      maxColumns: 100,
      align: 'center',
      transition: '0.5s ease',
      className: 'infinite-container',
      elementClassName: '',
      component: 'div',
      containerComponent: 'div',
      mobileWidth: 480,
      justifyOnMobile: true,
      margin: 0,
      scrollDelta: 0,
      direction: 'vertical',
      preRender: false,
    };
  },

  propTypes: {
    data: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
    maxColumns: React.PropTypes.number,
    align: React.PropTypes.string,
    transition: React.PropTypes.string,
    className: React.PropTypes.string,
    elementHeight: React.PropTypes.number,
    elementWidth: React.PropTypes.number,
    mobileWidth: React.PropTypes.number,
    elementMobileHeight: React.PropTypes.number,
    elementMobileWidth: React.PropTypes.number,
    margin: React.PropTypes.number,
    justifyOnMobile: React.PropTypes.bool,
    preRender: React.PropTypes.bool,
  },

  getInitialState: function () {
    return {
      scrollTop: 0,
      windowWidth: this.props.windowWidth || 800,
      windowHeight: this.props.windowHeight || 600,
      loaded: false,
      scrollDelta: 0,
      extra: {
        count: 0,
      },
    };
  },

  componentDidMount: function () {

    global.addEventListener('resize', this.onResize);

    if(this.props.transitionable){
      RAFList.bind(this.onScroll);
    } else {
      global.addEventListener('scroll', this.onScroll);
      this.onScroll()
    }

    this.setState({
      loaded: true,
      windowWidth: global.innerWidth,
      windowHeight: global.innerHeight,
      elementWidth: this.props.elementWidth ||
        this.refs.element1.getDOMNode().getClientRects()[0].width,
      elementHeight: this.props.elementHeight ||
        this.refs.element1.getDOMNode().getClientRects()[0].height,
      scrollTop: global.scrollY || 0,
    });
  },

  onScroll: function () {
    var scrollTop = this.props.transitionable ? this.props.transitionable.get() : global.scrollY;

    if(this.state.scrollTop !== scrollTop){
      this.setState({scrollTop: scrollTop,});
    }
  },

  onResize: function () {
    this.setState({windowHeight: global.innerHeight, windowWidth: global.innerWidth,});
  },

  componentWillUnmount: function () {
    global.removeEventListener('resize', this.onResize);
    if(this.props.transitionable){
      RAFList.unbind(this.onScroll);
    } else {
      global.removeEventListener('scroll', this.onScroll);
    }
  },

  vertical: function () {
    return layout('vertical');
  },

  horizontal: function () {
    return layout('horizontal');
  },

  render: function(){
    if(this.state.loaded === false) {
      return this.props.preRender ? React.createElement(this.props.containerComponent,
        {
          className: 'infinite-container', style: {
            fontSize: '0', position: 'relative',
            textAlign: this.props.align,
          },
        }, this.props.data.map(function (elementData, i) {
          return React.createElement(this.props.component, {
            style: {display: 'inline-block', margin: '32px', verticalAlign: 'top',},
          }, React.createElement(this.props.childComponent, elementData));
        }.bind(this)))
        : null;
    }

    if(this.props.direction === 'horizontal') {
      return this.horizontal();
    } else if(this.props.direction === 'vertical') {
      return this.vertical();
    } else {
      console.warn('the prop `direction` must be either "vertical" or "horizontal". It is set to',
        this.props.direction);
      return this.vertical();
    }
  },
});

module.exports = Infinite;
