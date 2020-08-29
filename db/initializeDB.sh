# mysql --user=$MYSQL_USER --password=$MYSQL_ROOT_PASSWORD -e "GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' IDENTIFIED BY 'secret';"
# mysql --user=$MYSQL_USER --password=$MYSQL_ROOT_PASSWORD -e "GRANT ALL PRIVILEGES ON *.* TO '$$MYSQL_USER'@'%' IDENTIFIED BY '$$MYSQL_ROOT_PASSWORD';"

echo Creating EZPoll DB
mysql --user=$MYSQL_USER --password=$MYSQL_ROOT_PASSWORD < ./scripts/ddl.sql

echo Populating EZPoll DB
mysql --user=$MYSQL_USER --password=$MYSQL_ROOT_PASSWORD --database="EZPoll" < ./scripts/dml.sql
