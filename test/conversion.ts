import 'mocha';
import xs from 'xstream';
import {createElement, PureComponent} from 'react';
import * as renderer from 'react-test-renderer';
import {h, ReactSource, makeCycleReactComponent} from '../src/index';
const assert = require('assert');

class Touchable extends PureComponent<any, any> {
  public press() {
    if (this.props.onPress) {
      this.props.onPress(null);
    }
  }

  public render() {
    return this.props.children;
  }
}

describe('Conversion', function() {
  it('converts an MVI Cycle app into a React component', done => {
    function main(sources: {react: ReactSource}) {
      const inc$ = sources.react.select('button').events('press');
      const count$ = inc$.fold((acc: number, x: any) => acc + 1, 0);
      const vdom$ = count$.map((i: number) =>
        h(Touchable, {selector: 'button'}, [h('div', [h('h1', {}, '' + i)])]),
      );
      return {react: vdom$};
    }

    let turn = 0;
    const RootComponent = makeCycleReactComponent(() => {
      const source = new ReactSource();
      const sink = main({react: source}).react;
      return {source, sink};
    });
    const r = renderer.create(createElement(RootComponent));
    const root = r.root;
    const check = () => {
      const to = root.findByType(Touchable);
      const view = to.props.children;
      const text = view.props.children;
      assert.strictEqual(text.props.children, `${turn}`);
      to.instance.press();
      turn++;
      if (turn === 3) {
        done();
      }
    };
    setTimeout(check, 50);
    setTimeout(check, 100);
    setTimeout(check, 150);
  });

  it('output React component routes props to sources.react.props()', done => {
    function main(sources: {react: ReactSource}) {
      sources.react.props().addListener({
        next: props => {
          assert.strictEqual(props.name, 'Alice');
          assert.strictEqual(props.age, 30);
          done();
        },
      });

      return {
        react: xs.of(
          h('section', [h('div', {}, [h('h1', {}, 'Hello world')])]),
        ),
      };
    }

    const RootComponent = makeCycleReactComponent(() => {
      const source = new ReactSource();
      const sink = main({react: source}).react;
      return {source, sink};
    });
    renderer.create(createElement(RootComponent, {name: 'Alice', age: 30}));
  });

  it('no synchronous race conditions with handler registration', done => {
    function main(sources: {react: ReactSource}) {
      const inc$ = xs.create({
        start(listener: any) {
          setTimeout(() => {
            sources.react
              .select('button')
              .events('press')
              .addListener(listener);
          }, 30);
        },
        stop() {},
      });
      const count$ = inc$.fold((acc: number, x: any) => acc + 1, 0);
      const vdom$ = count$.map((i: number) =>
        h(Touchable, {selector: 'button'}, [h('div', [h('h1', {}, '' + i)])]),
      );
      return {react: vdom$};
    }

    let turn = 0;
    const RootComponent = makeCycleReactComponent(() => {
      const source = new ReactSource();
      const sink = main({react: source}).react;
      return {source, sink};
    });
    const r = renderer.create(createElement(RootComponent));
    const root = r.root;
    const check = () => {
      const to = root.findByType(Touchable);
      const view = to.props.children;
      const text = view.props.children;
      assert.strictEqual(text.props.children, `${turn}`);
      to.instance.press();
      turn++;
      if (turn === 3) {
        done();
      }
    };
    setTimeout(check, 100);
    setTimeout(check, 150);
    setTimeout(check, 200);
  });
});
