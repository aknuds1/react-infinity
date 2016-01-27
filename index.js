'use strict';
var React = require('react');
var TransitionGroup = React.createFactory(require('react-addons-transition-group'));

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
function realRender(direction) {
  var windowWidth = this.state.windowWidth;
  var windowHeight = this.state.windowHeight;
  var elementWidth = this.props.mobileWidth <= windowWidth ? this.props.elementWidth :
    this.props.elementMobileWidth;
  var elementHeight = this.props.mobileWidth <= windowWidth ? this.props.elementHeight :
    this.props.elementMobileHeight;
  var stackElements = !!this.props.stackElements;
  var margin = this.props.margin;

  var windowX, windowY, elementX, elementY;
  if (direction === 'vertical') {
    windowX = windowWidth;
    windowY = windowHeight;
    elementX = elementWidth;
    elementY = elementHeight;
  } else {
    windowX = windowHeight;
    windowY = windowWidth;
    elementX = elementHeight;
    elementY = elementWidth;
  }

  if (this.props.justifyOnMobile && this.props.mobileWidth > windowWidth) {
    elementX = windowX;
    margin = 0;
  }

  var numElements = stackElements ? Math.max(
      1, Math.floor((windowX - margin) / (elementX + margin))) : 1;
  var extraSpace = windowX - numElements * (elementX + margin) + margin;
  var offset = this.props.align === 'left' ? 0 :
               this.props.align === 'center' ? Math.round(extraSpace / 2) : extraSpace;

  // Number of pixels the container has been scrolled from the top
  var scrollStart = this.state.scrollTop - this.props.scrollDelta;
  console.log(`Scrolled ${this.state.scrollTop} pixels from the top`)
  var numBefore = Math.floor((scrollStart - margin) / (elementHeight + margin));
  console.log(`Number of elements before scroll start: ${numBefore}`)
  var numVisible = Math.ceil(((numBefore * (elementY + margin)) + windowY) /
    (elementY + margin));
  console.log(`Number of visible elements: ${numVisible}`)

  // Keep some extra elements before and after visible elements
  var extra = numElements === 1 ? Math.ceil(numVisible / 2) : 2;
  var lowerLimit = (numBefore - extra) * numElements;
  var higherLimit = (numVisible + extra * 2) * numElements;
  console.log(`Lower limit: ${lowerLimit}, higherLimit: ${higherLimit}, extra: ${extra}`)

  var elementsToRender = [];
  this.props.data.forEach(function (obj, index) {
    if (index >= lowerLimit && index < higherLimit) {
      console.log(`Rendering data item ${index}:`, obj)
      var column, row;
      if (direction === 'vertical') {
        column = index % numElements;
        row = Math.floor(index / numElements);
      } else {
        row = index % numElements;
        column = Math.floor(index / numElements);
      }
      var id = obj.id != null ? obj.id : obj._id;
      var xOffset = (offset + column * (elementWidth + margin));
      var yOffset = (margin + row * (elementHeight + margin));
      console.log(`X offset: ${xOffset}, y offset: ${yOffset}`)
      var subContainer = SubContainer(
        {
          key: id,
          transform: 'translate(' + xOffset  + 'px, ' + yOffset + 'px)',
          width: elementWidth + 'px',
          height: elementHeight + 'px',
          transition: this.props.transition,
        },
        this.props.childComponent(obj)
      );
      elementsToRender.push(subContainer);
    } else {
      console.log(`Skipping data item ${index}`)
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
    elementsToRender
    // TransitionGroup(null, elementsToRender)
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
      id: null,
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
      stackElements: true,
    };
  },

  propTypes: {
    data: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
    maxColumns: React.PropTypes.number,
    align: React.PropTypes.string,
    transition: React.PropTypes.string,
    id: React.PropTypes.string,
    className: React.PropTypes.string,
    elementHeight: React.PropTypes.number,
    elementWidth: React.PropTypes.number,
    mobileWidth: React.PropTypes.number,
    elementMobileHeight: React.PropTypes.number,
    elementMobileWidth: React.PropTypes.number,
    margin: React.PropTypes.number,
    justifyOnMobile: React.PropTypes.bool,
    preRender: React.PropTypes.bool,
    scrollDelta: React.PropTypes.number,
    stackElements: React.PropTypes.bool,
  },

  getInitialState: function () {
    return {
      scrollTop: 0,
      windowWidth: this.props.windowWidth || 800,
      windowHeight: this.props.windowHeight || 600,
      loaded: false,
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

    if (this.state.scrollTop !== scrollTop) {
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

  render: function(){
    if (!this.state.loaded) {
      return this.props.preRender ? React.createElement(this.props.containerComponent,
        {
          className: this.props.className,
          id: this.props.id,
          style: {
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

    var direction = this.props.direction;
    if (direction !== 'horizontal' && direction !== 'vertical') {
      direction = 'vertical';
      console.warn('the prop `direction` must be either "vertical" or "horizontal". It is set to',
        direction);
    }
    return realRender.call(this, direction);
  },
});

module.exports = Infinite;
