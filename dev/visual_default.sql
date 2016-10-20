-- phpMyAdmin SQL Dump
-- version 4.5.2
-- http://www.phpmyadmin.net
--
-- Host: 127.0.0.1
-- Generation Time: Oct 20, 2016 at 09:55 PM
-- Server version: 5.7.9
-- PHP Version: 5.6.16

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `visual`
--

-- --------------------------------------------------------

--
-- Table structure for table `channels`
--

DROP TABLE IF EXISTS `channels`;
CREATE TABLE IF NOT EXISTS `channels` (
  `channel` varchar(500) NOT NULL,
  `data` longtext NOT NULL,
  `tiles` longtext NOT NULL,
  `objects` longtext NOT NULL,
  `spawn` varchar(11) NOT NULL,
  `ai` longtext NOT NULL,
  UNIQUE KEY `channel` (`channel`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `channels`
--

INSERT INTO `channels` (`channel`, `data`, `tiles`, `objects`, `spawn`, `ai`) VALUES
('/', '{}', '{}', '{}', '[]', '{}'),
('/test', '{}', '{"tileset.png":[{"left":352,"top":256,"sx":0,"sy":0,"order":0},{"left":352,"top":272,"sx":0,"sy":16,"order":1},{"left":352,"top":288,"sx":0,"sy":32,"order":2},{"left":368,"top":256,"sx":16,"sy":0,"order":3},{"left":368,"top":272,"sx":16,"sy":16,"order":4},{"left":368,"top":288,"sx":16,"sy":32,"order":5},{"left":384,"top":256,"sx":32,"sy":0,"order":6},{"left":384,"top":272,"sx":32,"sy":16,"order":7},{"left":384,"top":288,"sx":32,"sy":32,"order":8}]}', '{"tileset.png":[{"left":352,"top":352,"tiles":{"MaxX":3,"MaxY":3,"MinX":0,"MinY":0},"height":5,"collision":[0,45,0,49]},{"left":448,"top":352,"tiles":{"MaxX":3,"MaxY":3,"MinX":0,"MinY":0},"height":5,"collision":[0,16,0,16]}]}', '[400,400]', '{}'),
('this/', '{}', '{}', '{}', '[]', '{}');

-- --------------------------------------------------------

--
-- Table structure for table `channel_banned`
--

DROP TABLE IF EXISTS `channel_banned`;
CREATE TABLE IF NOT EXISTS `channel_banned` (
  `channelName` varchar(100) CHARACTER SET latin1 COLLATE latin1_general_ci NOT NULL,
  `banned` varchar(2000) CHARACTER SET latin1 COLLATE latin1_general_ci NOT NULL,
  UNIQUE KEY `channelName` (`channelName`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `channel_banned`
--

INSERT INTO `channel_banned` (`channelName`, `banned`) VALUES
('/', '[]'),
('/test', '[]'),
('this/', '[]');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `nick` varchar(500) NOT NULL,
  `role` int(2) NOT NULL,
  `pass` varchar(500) NOT NULL,
  `remote_addr` varchar(500) NOT NULL,
  UNIQUE KEY `nick` (`nick`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
