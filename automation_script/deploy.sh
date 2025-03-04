#!/bin/bash
ssh rdcd@10.11.200.32 << 'ENDSSH'
cd /home/rdcd/App/loan-core
tar -xzf loan_core.tar.gz 
rm loan_core.tar.gz
cd /home/rdcd/App/pm2-scripts
pm2 start pm2-loan-core.json
ENDSSH
