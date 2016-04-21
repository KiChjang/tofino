// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

import expect from 'expect';
import configureStore from '../../../../app/ui/browser/store/store';
import * as actions from '../../../../app/ui/browser/actions/main-actions';

describe('Action - SET_USER_TYPED_LOCATION', () => {
  beforeEach(function() {
    this.store = configureStore();
    this.getState = () => this.store.getState().browserWindow;
    this.dispatch = this.store.dispatch;

    const { dispatch } = this;
    dispatch(actions.createTab('http://moz1.org'));
    dispatch(actions.createTab('http://moz2.org'));
    dispatch(actions.createTab('http://moz3.org'));
    dispatch(actions.closeTab(this.getState().pages.get(0).id));

    dispatch(actions.setPageDetails(this.getState().pages.get(0).id, {
      title: 'moz1',
    }));
    dispatch(actions.setPageDetails(this.getState().pages.get(1).id, {
      title: 'moz2',
    }));
    dispatch(actions.setPageDetails(this.getState().pages.get(2).id, {
      title: 'moz3',
    }));
    dispatch(actions.setCurrentTab(this.getState().pages.get(0).id));
  });

  it('Should update page values', function() {
    const { dispatch, getState } = this;

    dispatch(actions.setUserTypedLocation(getState().pages.get(1).id, {
      text: 'Foo',
    }));
    expect(getState().pages.get(1).userTyped).toEqual('Foo');
  });
});