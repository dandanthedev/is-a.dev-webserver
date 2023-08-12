#!/bin/sh
echo " .----------------.  .----------------.  .----------------.  .----------------.  .----------------.  .----------------.  .----------------.  .----------------. "
echo " | .--------------. || .--------------. || .--------------. || .--------------. || .--------------. || .--------------. || .--------------. || .--------------. | "
echo " | |     _____    | || |    _______   | || |              | || |      __      | || |              | || |  ________    | || |  _________   | || | ____   ____  | | "
echo " | |    |_   _|   | || |   /  ___  |  | || |              | || |     /  \     | || |              | || | |_   ___ `.  | || | |_   ___  |  | || ||_  _| |_  _| | | "
echo " | |      | |     | || |  |  (__ \_|  | || |    ______    | || |    / /\ \    | || |              | || |   | |   `. \ | || |   | |_  \_|  | || |  \ \   / /   | | "
echo " | |      | |     | || |   '.___`-.   | || |   |______|   | || |   / ____ \   | || |              | || |   | |    | | | || |   |  _|  _   | || |   \ \ / /    | | "
echo " | |     _| |_    | || |  |`\____) |  | || |              | || | _/ /    \ \_ | || |      _       | || |  _| |___.' / | || |  _| |___/ |  | || |    \ ' /     | | "
echo " | |    |_____|   | || |  |_______.'  | || |              | || ||____|  |____|| || |     (_)      | || | |________.'  | || | |_________|  | || |     \_/      | | "
echo " | |              | || |              | || |              | || |              | || |              | || |              | || |              | || |              | | "
echo " | '--------------' || '--------------' || '--------------' || '--------------' || '--------------' || '--------------' || '--------------' || '--------------' | "
echo " '----------------'  '----------------'  '----------------'  '----------------'  '----------------'  '----------------'  '----------------'  '----------------'  "


echo "set nameserver to 1.1.1.1"
echo nameserver 1.1.1.1 > /etc/resolv.conf
/usr/bin/supervisord -n -c /etc/supervisor/supervisord.conf
bash