<?php
/**
 * QTR Framework — Public Entry Point
 * Tüm HTTP istekleri buraya gelir ve ana router'a aktarılır.
 */

define('QTR_ROOT', dirname(__DIR__));
define('QTR_PUBLIC', __DIR__);

require_once QTR_ROOT . '/index.php';
