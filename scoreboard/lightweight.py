# Copyright 2016 David Tomaschik <david@systemoverlord.com>
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""
Implementation of lightweight proxy objects that can be used in the flask
session to avoid a database hit on common operations.
"""

from scoreboard import models


class Proxy(object):
    """Lightweight proxy for database model.

    This is not thread-safe."""

    def __init__(self, wrapped):
        self._wrapped = wrapped
        self._dict = self._load()

    def _fields(self):
        """Return fields to keep in proxy."""
        raise NotImplementedError("Should be implemented by subclass.")

    def _get_instance(self):
        """Get the underlying model instance."""
        raise NotImplementedError("Should be implemented by subclass.")

    def _load(self):
        """Copy in fields from the wrapped object."""
        if not self._wrapped:
            return {}
        result = {}
        for field in self._fields():
            result[field] = getattr(self._wrapped, field)
        return result

    def __getattr__(self, name):
        try:
            return self._dict[name]
        except KeyError:
            if not self._wrapped:
                self._wrapped = self._get_instance()
                if not self._wrapped:
                    raise AttributeError(
                        "Could not find underlying representation for {}".format(
                            type(self).__name__))
            self._dict = self._load()
            return getattr(self._wrapped, name)

    def __setattr__(self, name, value):
        if name in ('_wrapped', '_dict'):
            return super(Proxy, self).__setattr__(name, value)
        rv = setattr(self._wrapped, name, value)
        self._dict = self._load()
        return rv

    def ToJSON(self):
        return self._dict

    @classmethod
    def FromJSON(cls, obj):
        o = cls(None)
        if isinstance(obj, dict):
            o._dict = obj
        else:
            o._dict = {}
        return o


class User(Proxy):

    def _fields(self):
        return ('uid', 'email', 'nick', 'admin', 'team_tid')

    def _get_instance(self):
        return models.User.query.get(self._dict['uid'])


class Team(Proxy):
    
    def _fields(self):
        return ('tid', 'name')

    def _get_instance(self):
        return models.Team.query.get(self._dict['tid'])
