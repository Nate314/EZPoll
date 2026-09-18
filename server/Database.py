import re
import pymysql
from Config import Config

# table/column names are never user input, but they are still checked so that
# no value can ever reach the SQL text except through %s parameters
_IDENTIFIER = re.compile(r'^[A-Za-z_][A-Za-z0-9_]*$')

def _identifier(name):
    if name != '*' and not _IDENTIFIER.match(name):
        raise ValueError('invalid SQL identifier')
    return name

# used to interact with the database
class Database(object):

    #PUBLIC
    # initialize Database
    def __init__(self):
        self.host = Config.host
        self.port = Config.port
        self.user = Config.user
        self.passwd = Config.password
        self.db = Config.db

    #PRIVATE
    # gets a database connection
    def __getConnection(self):
        return pymysql.connect(host = self.host,
            port = self.port, user = self.user,
            passwd = self.passwd, db = self.db,
            charset = 'utf8mb4', connect_timeout = 5,
            autocommit = True)

    #PRIVATE
    # executes a parameterized query on this database
    def __executesafe(self, query, values):
        conn = self.__getConnection()
        try:
            cur = conn.cursor()
            cur.execute(query, values)
            cur.close()
            return cur
        finally:
            conn.close()

    #PUBLIC
    # returns DataTable for query (values are always bound as parameters)
    def getDataTable(self, query, values):
        cur = self.__executesafe(query, tuple(values))
        return DataTable(cur)

    #PUBLIC
    # returns DataTable for select
    def select(self, columns: list, table: str, where = '', values: list = []):
        cols = ', '.join(_identifier(c) for c in columns)
        query = 'SELECT ' + cols + ' FROM ' + _identifier(table)
        if where != '':
            query += ' WHERE ' + where
        return self.getDataTable(query + ';', values)

    #PUBLIC
    # returns True/False for inserting one item
    def insertOne(self, table: str, props: list, entity):
        return self.insert(table, props, [entity])

    #PUBLIC
    # returns True/False for inserting multiple items
    def insert(self, table: str, props: list, entities: list):
        try:
            row = '(' + ', '.join(['%s'] * len(props)) + ')'
            query = 'INSERT INTO ' + _identifier(table) + ' (' + ', '.join(_identifier(p) for p in props) + ') VALUES '
            query += ', '.join([row] * len(entities)) + ';'
            values = []
            for entity in entities:
                for key in props:
                    values.append(None if entity[key] is None else str(entity[key]))
            self.__executesafe(query, tuple(values))
            return True
        except Exception as e:
            print('insert failed:', type(e).__name__)
            return False

    #PUBLIC
    # returns True/False for updating one to many items
    def update(self, table: str, props: list, entity, where: str, values: list):
        try:
            sets = ', '.join(_identifier(p) + ' = %s' for p in props)
            query = 'UPDATE ' + _identifier(table) + ' SET ' + sets + ' WHERE ' + where + ';'
            self.__executesafe(query, tuple([entity[p] for p in props] + list(values)))
            return True
        except Exception as e:
            print('update failed:', type(e).__name__)
            return False

    #PUBLIC
    # returns the deleted rows as a DataTable, or False on failure
    def delete(self, table: str, where: str, values: list):
        try:
            dt = self.select(['*'], table, where, values)
            self.__executesafe('DELETE FROM ' + _identifier(table) + ' WHERE ' + where + ';', tuple(values))
            return dt
        except Exception as e:
            print('delete failed:', type(e).__name__)
            return False

# used to interface with returned datatables from the database
class DataTable(object):

    #PUBLIC
    # initialize DataTable
    def __init__(self, cur):
        self.columns = [column[0] for column in cur.description]
        self.rows = []
        for row in cur:
            self.rows.append(DataRow(self.columns, row))

    #PUBLIC
    # get list of column titles for this DataTable
    def getColumns(self):
        return self.columns

    #PUBLIC
    # get list of DataRow objects in this DataTable
    def getRows(self):
        return self.rows

    #PUBLIC
    # return indexed item like this // dt[RowIndex]
    def __getitem__(self, index):
        return self.getRows()[index]

    #PUBLIC
    # returns JSON serializable verions of a datatable
    def toJSON(self):
        return [row.toJSON() for row in self.getRows()]

    #PUBLIC
    # first row, or None when the table is empty
    def first(self):
        return self.rows[0] if len(self.rows) > 0 else None

class DataRow(object):

    #PUBLIC
    # initialize DataRow
    def __init__(self, columns, row):
        self.dictionary = {}
        if len(columns) == len(row):
            for i in range(len(columns)):
                self.dictionary.update({columns[i]: row[i]})
        else:
            raise Exception('error creating datarow. number of columns does not match number of rows.')

    #PUBLIC
    # return indexed item like this // dr['Column']
    def __getitem__(self, key):
        return self.dictionary[key]

    #PUBLIC
    # returns JSON serializable version of a row (values are stringified)
    def toJSON(self):
        return {key: str(value) for key, value in self.dictionary.items()}
