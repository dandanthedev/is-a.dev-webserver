#!/bin/sh

echo "set nameserver to 1.1.1.1"
echo nameserver 1.1.1.1 > /etc/resolv.conf
/usr/bin/supervisord -n -c /etc/supervisor/supervisord.conf
bash